import { CommandContext, Context } from "grammy";
import type { AppContainer } from "../../app/bootstrap/app-container.js";
import { getRunningInstances, getInstance, configuredRoots } from "../../reasonix/instance.js";
import { reasonixClient } from "../../reasonix/client.js";
import { logger } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";
import { isContainerRuntime } from "../../runtime/container.js";
import { editBotText } from "../messages/telegram-text.js";

export type ReasonixStartCommandDeps = Pick<AppContainer, "reasonixReadyLifecycle">;

/**
 * Command handler for /reasonix_start
 * Starts the Reasonix serve instance for the active project root. The bot starts
 * every root on demand, so this is only an eager warm-up or a recovery after
 * `/reasonix_stop`.
 */
export async function reasonixStartCommand(
  ctx: CommandContext<Context>,
  deps: ReasonixStartCommandDeps,
) {
  try {
    if (isContainerRuntime()) {
      await ctx.reply(t("runtime.container.command_unavailable"));
      return;
    }

    const root = reasonixClient.getActiveRoot();
    const alreadyRunning = getRunningInstances().some((instance) => instance.root === root);

    if (alreadyRunning) {
      const health = await reasonixClient.global.health({ directory: root });
      await ctx.reply(
        t("reasonix_start.already_running", { version: health.data?.version || t("common.unknown") }),
      );
      await deps.reasonixReadyLifecycle.notifyReady("reasonix_start_already_running");
      return;
    }

    // A root that stopped outside the bot leaves the lifecycle ready, and the start
    // below would then skip the ready refresh (model catalog, selection check, session restore).
    deps.reasonixReadyLifecycle.notifyUnavailable("reasonix_start_not_running");

    const statusMessage = await ctx.reply(t("reasonix_start.starting"));

    let instance;
    try {
      instance = await getInstance(root);
    } catch (error) {
      logger.error("[Bot] Reasonix serve failed to start", error);
      await editBotText({
        api: ctx.api,
        chatId: ctx.chat.id,
        messageId: statusMessage.message_id,
        text: t("reasonix_start.start_error", { error: String(error) }),
      });
      return;
    }

    const health = await reasonixClient.global.health({ directory: root });

    await editBotText({
      api: ctx.api,
      chatId: ctx.chat.id,
      messageId: statusMessage.message_id,
      text: t("reasonix_start.success", {
        root: instance.root,
        port: instance.port,
        version: health.data?.version || t("common.unknown"),
      }),
    });

    logger.info(
      `[Bot] Reasonix serve started, root=${instance.root}, port=${instance.port} (${configuredRoots().length} configured)`,
    );
    await deps.reasonixReadyLifecycle.notifyReady("reasonix_start_success");
  } catch (err) {
    logger.error("[Bot] Error in /reasonix_start command:", err);
    await ctx.reply(t("reasonix_start.error"));
  }
}