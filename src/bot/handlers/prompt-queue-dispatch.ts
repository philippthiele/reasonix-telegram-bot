import type { Context } from "grammy";
import {
  MAX_QUEUED_PROMPTS,
  promptQueue,
  type QueuedPromptInput,
} from "../../app/managers/prompt-queue-manager.js";
import { promptHandover, type ArrivalTicket } from "../../app/managers/prompt-handover-manager.js";
import type { IncomingPrompt } from "../../app/types/prompt.js";
import {
  cancelInboxPrompt,
  reconcileInboxPrompts,
} from "../../app/services/prompt-inbox-service.js";
import { isForegroundBusy } from "../../app/services/run-control-service.js";
import { getCurrentSession } from "../../app/services/session-service.js";
import { getPromptQueueMode } from "../../app/stores/settings-store.js";
import { t } from "../../i18n/index.js";
import { logger } from "../../utils/logger.js";
import { isReplyKeyboardButtonText } from "../message-patterns.js";
import { admitPromptToInbox, startInboxPromptRun, type ProcessPromptDeps } from "./prompt.js";
import { handOverPreparedPrompt } from "./prompt-handover.js";

// The queue helpers are called from the guard and the media handlers without
// deps, so the dispatcher receives them once at startup instead. Until then the
// chat counts as not busy and nothing is queued.
let promptDeps: ProcessPromptDeps | null = null;

export function initializePromptQueueDispatch(deps: ProcessPromptDeps): void {
  promptDeps = deps;
}

function isBusy(): boolean {
  return promptDeps !== null && (isForegroundBusy(promptDeps) || waitsForHandedOverPrompts());
}

/** Prompts handed over to the current session at /detach go before anything sent since. */
function waitsForHandedOverPrompts(): boolean {
  const session = getCurrentSession();
  return Boolean(session && promptHandover.hasPendingPrompts(session.id));
}

function isPromptQueueEnabled(): boolean {
  return getPromptQueueMode() !== "off";
}

/** Whether the text is user prompt content rather than a command or a button press. */
function isQueueablePrompt(input: IncomingPrompt): boolean {
  const normalizedText = input.text.trim();
  const hasContent =
    Boolean(normalizedText) || input.fileParts.length > 0 || input.photos.length > 0;
  return (
    hasContent &&
    !normalizedText.startsWith("/") &&
    !isReplyKeyboardButtonText(input.text)
  );
}

/**
 * Whether the user should be told that this message could have been queued.
 * True only when the setting is off and the text would otherwise have been queued.
 */
export function shouldSuggestPromptQueue(input: IncomingPrompt): boolean {
  return !isPromptQueueEnabled() && isQueueablePrompt(input);
}

export function canQueueMediaPrompt(ctx: Context): boolean {
  const message = ctx.message;
  return Boolean(
    isPromptQueueEnabled() &&
      message &&
      (message.voice || message.audio || message.photo?.length || message.document),
  );
}

/**
 * Queues a prepared prompt that arrived while the session was busy.
 * Returns false when queueing does not apply, so the caller keeps its old behaviour.
 */
export async function tryEnqueuePrompt(ctx: Context, input: QueuedPromptInput): Promise<boolean> {
  if (!promptDeps || !isPromptQueueEnabled() || !ctx.chat || !isQueueablePrompt(input)) {
    return false;
  }

  await sendPromptToInbox(ctx, input, promptDeps);
  return true;
}

/**
 * Sends a busy-time prompt into the Reasonix session inbox and mirrors it as a queue
 * item. The reservation keeps the cap honest while the prompt is on its way and tells
 * whether the queue was cleared in the meantime.
 */
async function sendPromptToInbox(
  ctx: Context,
  input: QueuedPromptInput,
  deps: ProcessPromptDeps,
): Promise<void> {
  const reservationId = promptQueue.reserve();
  if (!reservationId) {
    logger.info(`[PromptQueue] Rejected inbox prompt: queue is full (max=${MAX_QUEUED_PROMPTS})`);
    await replyWithKeyboard(ctx, t("queue.full", { max: String(MAX_QUEUED_PROMPTS) }));
    return;
  }

  const admitted = await admitPromptToInbox(ctx, input, deps);
  if (!admitted) {
    promptQueue.releaseReservation(reservationId);
    promptQueue.releaseHandedOverReservation(reservationId);
    return;
  }

  const inbox = { sessionId: admitted.sessionId, inboxId: admitted.inboxId };

  // Handed over by /detach while on its way: it stays with that session, and nothing is shown.
  if (promptQueue.releaseHandedOverReservation(reservationId)) {
    promptHandover.addInboxEntry(inbox);
    return;
  }

  // Reasonix may deliver the prompt before the send returns (the turn had just ended):
  // the pickup has already been shown, so there is no button, only the run to open.
  if (promptQueue.wasInboxIdDelivered(admitted.inboxId)) {
    if (!promptQueue.releaseReservation(reservationId)) {
      return;
    }
    if (!deps.assistantRunState.hasBotRun(admitted.sessionId)) {
      const session = getCurrentSession();
      if (session?.id === admitted.sessionId) {
        await startInboxPromptRun(session, deps, input.responseMode);
      }
    }
    await replyInboxAdmission(ctx);
    return;
  }

  const item = promptQueue.confirmReservation(reservationId, {
    displayText: input.displayText ?? input.text,
    inbox,
    ...(input.responseMode ? { responseMode: input.responseMode } : {}),
  });
  if (!item) {
    // Cleared by /abort or a session change while the prompt was on its way.
    await cancelInboxPrompt(inbox, "withdrawn_during_admission");
    return;
  }

  logger.info(
    `[PromptQueue] Prompt sent to the session inbox: size=${promptQueue.size()}/${MAX_QUEUED_PROMPTS}`,
  );
  await replyInboxAdmission(ctx);
}

async function replyInboxAdmission(ctx: Context): Promise<void> {
  const params = { count: String(promptQueue.size()), max: String(MAX_QUEUED_PROMPTS) };
  await replyWithKeyboard(ctx, t("queue.added", params));
}

/**
 * The session a message arriving now would wait for, taken before the message is
 * prepared; undefined when it would not wait.
 */
export function takeArrivalTicket(): ArrivalTicket | undefined {
  const session = getCurrentSession();
  if (!session || !isPromptQueueEnabled() || !isBusy()) {
    return undefined;
  }
  return promptHandover.takeTicket(session.id);
}

/**
 * Queues a prepared prompt when the session is busy. A message whose preparation
 * outlived /detach goes to the session it arrived for, as one sent right before.
 */
export async function tryEnqueuePromptIfBusy(
  ctx: Context,
  input: QueuedPromptInput,
  ticket?: ArrivalTicket,
): Promise<boolean> {
  if (ticket && promptHandover.wasDetachedSince(ticket) && isQueueablePrompt(input)) {
    return handOverPreparedPrompt(ctx, ticket, input);
  }
  return isBusy() && tryEnqueuePrompt(ctx, input);
}

/**
 * Rejects a busy queued-media candidate before handlers download or encode it.
 * Media sizes are raw Telegram file_size values, not expanded data-URI bytes.
 */
export async function rejectQueuedMediaBeforePreparation(ctx: Context): Promise<boolean> {
  if (!isBusy() || !isPromptQueueEnabled() || !ctx.chat) {
    return false;
  }
  if (promptQueue.isFull()) {
    await replyWithKeyboard(ctx, t("queue.full", { max: String(MAX_QUEUED_PROMPTS) }));
    return true;
  }
  return false;
}

/**
 * Drops mirror items whose pickup or cancel the bot missed. Reasonix delivers the
 * waiting prompts itself, so an idle point is all the bot has to react to.
 */
export async function dispatchNextQueuedPrompt(): Promise<void> {
  const session = getCurrentSession();
  if (session) {
    await reconcileInboxPrompts(session.id);
  }
}

async function replyWithKeyboard(ctx: Context, text: string): Promise<void> {
  const keyboard = promptDeps?.keyboardManager.getKeyboard();
  await ctx.reply(text, keyboard ? { reply_markup: keyboard } : {}).catch((err) => {
    logger.error("[PromptQueue] Failed to send queue reply:", err);
  });
}

/** Test helper: clears the stored dependencies. */
export function __resetPromptQueueDispatchForTests(): void {
  promptDeps = null;
}
