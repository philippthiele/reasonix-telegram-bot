import type { Context } from "grammy";
import {
  promptHandover,
  type ArrivalTicket,
  type HandoverSelection,
} from "../../app/managers/prompt-handover-manager.js";
import { promptQueue, type QueuedPromptInput } from "../../app/managers/prompt-queue-manager.js";
import { getStoredAgent, resolveProjectAgent } from "../../app/services/agent-selection-service.js";
import { getStoredModel } from "../../app/services/model-selection-service.js";
import { cancelInboxPrompt } from "../../app/services/prompt-inbox-service.js";
import type { SessionInfo } from "../../app/types/session.js";
import { config } from "../../config.js";
import { t } from "../../i18n/index.js";
import { logger } from "../../utils/logger.js";
import { admitHandedOverPromptToInbox, type ProcessPromptDeps } from "./prompt.js";

// Received once at startup, like the queue dispatcher: the prepared-prompt hand-over
// runs without an update context of its own.
let handoverDeps: ProcessPromptDeps | null = null;

export function initializePromptHandover(deps: ProcessPromptDeps): void {
  handoverDeps = deps;
}

async function readSelection(): Promise<HandoverSelection> {
  const agent = await resolveProjectAgent(getStoredAgent());
  const model = getStoredModel();
  return {
    agent,
    providerID: model.providerID,
    modelID: model.modelID,
    variant: model.variant,
  };
}

/**
 * /detach: what waits for the running turn stays with the session instead of being
 * withdrawn. The prompts stay in the Reasonix inbox, which delivers them itself once
 * the running turn ends. Must run before the session is cleared.
 */
export async function handOverPromptQueue(session: SessionInfo): Promise<void> {
  const selection = await readSelection();
  promptHandover.recordDetach(session, selection);

  for (const item of promptQueue.handOver(session.id, "detach_command")) {
    if (item.inbox) {
      promptHandover.addInboxEntry(item.inbox);
    }
  }
}

/**
 * A message whose preparation outlived /detach goes to the session it was sent to, as one
 * sent right before /detach. Returns false when that session was not detached since.
 */
export async function handOverPreparedPrompt(
  ctx: Context,
  ticket: ArrivalTicket,
  input: QueuedPromptInput,
): Promise<boolean> {
  const record = promptHandover.get(ticket.sessionId);
  if (!record || !promptHandover.wasDetachedSince(ticket) || !handoverDeps) {
    return false;
  }
  logger.info(
    `[PromptHandover] Prepared prompt follows its detached session: session=${record.sessionId}`,
  );

  const inboxId = await admitHandedOverPromptToInbox(
    ctx.api,
    input,
    { id: record.sessionId, directory: record.directory },
    record.selection,
    handoverDeps,
  );
  if (!inboxId) {
    await notifyDeliveryFailure(record.sessionId);
    return true;
  }

  const inbox = { sessionId: record.sessionId, inboxId };
  if (!promptHandover.addInboxEntry(inbox)) {
    // Withdrawn by /abort or /reasonix_stop while the prompt was on its way.
    await cancelInboxPrompt(inbox, "withdrawn_during_handover");
  }
  return true;
}

/** /abort in the session: what was handed over to it is withdrawn with the rest. */
export async function withdrawHandedOverPrompts(sessionId: string, reason: string): Promise<void> {
  promptQueue.withdrawHandedOverReservations(sessionId);
  const inboxEntries = promptHandover.withdraw(sessionId, reason);
  await Promise.all(inboxEntries.map((inbox) => cancelInboxPrompt(inbox, reason)));
}

/** /reasonix_stop: everything handed over to any session is withdrawn. */
export async function withdrawAllHandedOverPrompts(reason: string): Promise<void> {
  promptQueue.withdrawHandedOverReservations();
  const inboxEntries = promptHandover.withdrawAll(reason);
  await Promise.all(inboxEntries.map((inbox) => cancelInboxPrompt(inbox, reason)));
}

/** A failed delivery is posted only when the bot has re-attached to that session. */
async function notifyDeliveryFailure(sessionId: string): Promise<void> {
  const deps = handoverDeps;
  if (!deps?.attachManager.isAttachedSession(sessionId)) {
    return;
  }

  await deps.bot.api
    .sendMessage(config.telegram.allowedUserId, t("bot.prompt_send_error"))
    .catch((err) => {
      logger.error("[PromptHandover] Failed to report a handed-over prompt failure:", err);
    });
}

/** Test helper: forgets the stored dependencies. */
export function __resetPromptHandoverForTests(): void {
  handoverDeps = null;
}
