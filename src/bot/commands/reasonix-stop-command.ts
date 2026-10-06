import { CommandContext, Context } from "grammy";
import type { AppContainer } from "../../app/bootstrap/app-container.js";
import { getRunningInstances, stopAllInstances } from "../../reasonix/instance.js";
import { stopEventListening } from "../../reasonix/event-stream.js";
import { logger } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";
import { isContainerRuntime } from "../../runtime/container.js";
import { editBotText } from "../messages/telegram-text.js";
import { promptQueue } from "../../app/managers/prompt-queue-manager.js";
import { withdrawPromptQueue } from "../../app/services/prompt-inbox-service.js";
import { markAttachedSessionIdle } from "../../app/services/attach-service.js";
import { clearPromptResponseMode } from "../handlers/prompt.js";
import { withdrawAllHandedOverPrompts } from "../handlers/prompt-handover.js";

export type ReasonixStopCommandDeps = Pick<
  AppContainer,
  | "attachManager"
  | "endRunLostWithServer"
  | "foregroundSessionState"
  | "reasonixReadyLifecycle"
  | "resetInteractions"
  | "resetRuntimeStreams"
>;

const STOP_REASON = "reasonix_stop";

async function releaseLocalStateAfterServerStop(deps: ReasonixStopCommandDeps): Promise<void> {
  const sessionIds = new Set<string>();

  for (const session of deps.foregroundSessionState.getBusySessions()) {
    sessionIds.add(session.sessionId);
  }

  const attached = deps.attachManager.getSnapshot();
  if (attached) {
    sessionIds.add(attached.sessionId);
  }

  // The stopped server never ends its run: the chat ends it as after /abort.
  await deps.endRunLostWithServer(STOP_REASON);
  deps.resetRuntimeStreams(STOP_REASON);
  deps.foregroundSessionState.clearAll(STOP_REASON);

  if (attached) {
    await markAttachedSessionIdle(attached.sessionId, deps);
  }

  for (const sessionId of sessionIds) {
    clearPromptResponseMode(sessionId);
  }

  promptQueue.clear(STOP_REASON);
  deps.resetInteractions(STOP_REASON);
  deps.reasonixReadyLifecycle.notifyUnavailable(STOP_REASON);
}

/**
 * Command handler for /reasonix_stop
 * Stops the Reasonix serve processes this bot started. They start again on next use.
 */
export async function reasonixStopCommand(
  ctx: CommandContext<Context>,
  deps: ReasonixStopCommandDeps,
) {
  try {
    if (isContainerRuntime()) {
      await ctx.reply(t("runtime.container.command_unavailable"));
      return;
    }

    const count = getRunningInstances().length;
    if (count === 0) {
      await ctx.reply(t("reasonix_stop.not_running"));
      return;
    }

    const statusMessage = await ctx.reply(t("reasonix_stop.stopping", { count }));

    // A Reasonix inbox outlives the process, so waiting prompts are withdrawn first,
    // those handed over at /detach included.
    await withdrawPromptQueue(STOP_REASON);
    await withdrawAllHandedOverPrompts(STOP_REASON);

    // Stop listening before the processes die: the reconnect loop re-subscribes through the
    // client, which would immediately spawn a fresh serve and undo the stop. The next use
    // re-subscribes and starts serve again.
    stopEventListening();

    await stopAllInstances();
    await releaseLocalStateAfterServerStop(deps);

    await editBotText({
      api: ctx.api,
      chatId: ctx.chat.id,
      messageId: statusMessage.message_id,
      text: t("reasonix_stop.success", { count }),
    });

    logger.info(`[Bot] Stopped ${count} Reasonix serve instance(s)`);
  } catch (err) {
    logger.error("[Bot] Error in /reasonix_stop command:", err);
    await ctx.reply(t("reasonix_stop.error"));
  }
}