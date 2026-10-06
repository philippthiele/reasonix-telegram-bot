import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { t } from "../../../src/i18n/index.js";

const mocked = vi.hoisted(() => ({
  getRunningInstancesMock: vi.fn(),
  stopAllInstancesMock: vi.fn(),
  editBotTextMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  clearRuntimeStateMock: vi.fn(),
  getBusySessionsMock: vi.fn(),
  clearAllForegroundMock: vi.fn(),
  attachGetSnapshotMock: vi.fn(),
  markAttachedSessionIdleMock: vi.fn(),
  clearPromptResponseModeMock: vi.fn(),
  notifyUnavailableMock: vi.fn(),
  stopEventListeningMock: vi.fn(),
}));

const withdrawPromptQueueMock = vi.hoisted(() => vi.fn());
const withdrawAllHandedOverPromptsMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/reasonix/instance.js", () => ({
  getRunningInstances: mocked.getRunningInstancesMock,
  stopAllInstances: mocked.stopAllInstancesMock,
}));

vi.mock("../../../src/reasonix/event-stream.js", () => ({
  stopEventListening: mocked.stopEventListeningMock,
}));

vi.mock("../../../src/bot/messages/telegram-text.js", () => ({
  editBotText: mocked.editBotTextMock,
}));

vi.mock("../../../src/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: mocked.loggerInfoMock,
    warn: vi.fn(),
    error: mocked.loggerErrorMock,
  },
}));

vi.mock("../../../src/app/services/attach-service.js", () => ({
  markAttachedSessionIdle: mocked.markAttachedSessionIdleMock,
}));

vi.mock("../../../src/bot/handlers/prompt.js", () => ({
  clearPromptResponseMode: mocked.clearPromptResponseModeMock,
}));

vi.mock("../../../src/bot/handlers/prompt-handover.js", () => ({
  withdrawAllHandedOverPrompts: withdrawAllHandedOverPromptsMock,
}));

vi.mock("../../../src/app/services/prompt-inbox-service.js", () => ({
  withdrawPromptQueue: withdrawPromptQueueMock,
}));

import { reasonixStopCommand } from "../../../src/bot/commands/reasonix-stop-command.js";
import { promptQueue } from "../../../src/app/managers/prompt-queue-manager.js";
import { startInteractionForTest } from "../../helpers/interaction.js";
import { createTestAppContainer } from "../../helpers/app-container.js";
import type { AppContainer } from "../../../src/app/bootstrap/app-container.js";

function createContext(): Context {
  return {
    chat: { id: 42, type: "private" },
    api: {},
    reply: vi.fn().mockResolvedValue({ message_id: 11 }),
  } as unknown as Context;
}

let container: AppContainer;

function createDeps() {
  return {
    ...container,
    resetRuntimeStreams: mocked.clearRuntimeStateMock,
    foregroundSessionState: {
      getBusySessions: mocked.getBusySessionsMock,
      clearAll: mocked.clearAllForegroundMock,
    } as never,
    attachManager: { getSnapshot: mocked.attachGetSnapshotMock } as never,
    reasonixReadyLifecycle: { notifyUnavailable: mocked.notifyUnavailableMock } as never,
  };
}

/** Mirrors one prompt Reasonix is holding for the session. */
function mirrorQueuedPrompt(displayText: string): void {
  promptQueue.confirmReservation(promptQueue.reserve()!, {
    displayText,
    inbox: { sessionId: "ses-1", inboxId: "msg-1" },
  });
}

beforeEach(() => {
  container = createTestAppContainer();
});

describe("bot/commands/reasonix-stop-command", () => {
  beforeEach(() => {
    mocked.getRunningInstancesMock.mockReset().mockReturnValue([]);
    mocked.stopAllInstancesMock.mockReset().mockResolvedValue(undefined);
    mocked.editBotTextMock.mockReset().mockResolvedValue(undefined);
    mocked.loggerInfoMock.mockReset();
    mocked.loggerErrorMock.mockReset();
    mocked.clearRuntimeStateMock.mockReset();
    mocked.getBusySessionsMock.mockReset().mockReturnValue([]);
    mocked.clearAllForegroundMock.mockReset();
    mocked.attachGetSnapshotMock.mockReset().mockReturnValue(null);
    mocked.markAttachedSessionIdleMock.mockReset().mockResolvedValue(undefined);
    mocked.clearPromptResponseModeMock.mockReset();
    mocked.notifyUnavailableMock.mockReset();
    mocked.stopEventListeningMock.mockReset();
    withdrawPromptQueueMock.mockReset().mockResolvedValue(undefined);
    withdrawAllHandedOverPromptsMock.mockReset().mockResolvedValue(undefined);
    promptQueue.__resetForTests();
    container.interactionManager.clear("test_setup");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("warns when running in a container", async () => {
    const ctx = createContext();
    vi.stubEnv("REASONIX_TELEGRAM_CONTAINER", "1");

    await reasonixStopCommand(ctx as never, createDeps());

    expect(ctx.reply).toHaveBeenCalledWith(t("runtime.container.command_unavailable"));
    expect(mocked.stopAllInstancesMock).not.toHaveBeenCalled();
    expect(mocked.clearRuntimeStateMock).not.toHaveBeenCalled();
  });

  it("reports not_running when the bot started no instance", async () => {
    const ctx = createContext();

    await reasonixStopCommand(ctx as never, createDeps());

    expect(ctx.reply).toHaveBeenCalledWith(t("reasonix_stop.not_running"));
    expect(mocked.stopAllInstancesMock).not.toHaveBeenCalled();
    expect(mocked.clearRuntimeStateMock).not.toHaveBeenCalled();
  });

  it("stops every running instance and releases the local state", async () => {
    const ctx = createContext();
    mocked.getRunningInstancesMock.mockReturnValue([
      { root: "/repo-a", port: 47610 },
      { root: "/repo-b", port: 47611 },
    ]);

    await reasonixStopCommand(ctx as never, createDeps());

    expect(ctx.reply).toHaveBeenCalledWith(t("reasonix_stop.stopping", { count: 2 }));
    expect(mocked.stopAllInstancesMock).toHaveBeenCalledTimes(1);
    expect(mocked.clearRuntimeStateMock).toHaveBeenCalledWith("reasonix_stop");
    expect(mocked.clearAllForegroundMock).toHaveBeenCalledWith("reasonix_stop");
    expect(promptQueue.size()).toBe(0);
    expect(container.interactionManager.isActive()).toBe(false);
    expect(mocked.notifyUnavailableMock).toHaveBeenCalledWith("reasonix_stop");
    expect(mocked.editBotTextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: t("reasonix_stop.success", { count: 2 }) }),
    );
  });

  it("withdraws the waiting inbox prompts before stopping, since they outlive the process", async () => {
    const order: string[] = [];
    withdrawPromptQueueMock.mockImplementation(async () => {
      order.push("withdraw");
    });
    withdrawAllHandedOverPromptsMock.mockImplementation(async () => {
      order.push("withdraw_handed_over");
    });
    mocked.getRunningInstancesMock.mockReturnValue([{ root: "/repo-a", port: 47610 }]);
    mocked.stopAllInstancesMock.mockImplementation(async () => {
      order.push("stop");
    });

    await reasonixStopCommand(createContext() as never, createDeps());

    expect(withdrawPromptQueueMock).toHaveBeenCalledWith("reasonix_stop");
    expect(withdrawAllHandedOverPromptsMock).toHaveBeenCalledWith("reasonix_stop");
    expect(order).toEqual(["withdraw", "withdraw_handed_over", "stop"]);
  });

  it("ends the lost run in the chat after the stop and before the local reset", async () => {
    const order: string[] = [];
    mocked.getRunningInstancesMock.mockReturnValue([{ root: "/repo-a", port: 47610 }]);
    mocked.stopAllInstancesMock.mockImplementation(async () => {
      order.push("stop");
    });
    mocked.clearRuntimeStateMock.mockImplementation(() => {
      order.push("reset");
    });
    const endRunLostWithServer = vi.fn(async (reason: string) => {
      order.push(`end:${reason}`);
    });

    await reasonixStopCommand(createContext() as never, { ...createDeps(), endRunLostWithServer });

    expect(order).toEqual(["stop", "end:reasonix_stop", "reset"]);
  });

  it("clears busy sessions, the mirror, and attached state after a successful stop", async () => {
    mocked.getRunningInstancesMock.mockReturnValue([{ root: "/repo-a", port: 47610 }]);
    mocked.getBusySessionsMock.mockReturnValue([
      { sessionId: "ses-1", directory: "D:/repo", markedAt: 1 },
      { sessionId: "ses-2", directory: "D:/repo", markedAt: 2 },
    ]);
    mocked.attachGetSnapshotMock.mockReturnValue({
      sessionId: "ses-1",
      directory: "D:/repo",
      busy: true,
    });
    mirrorQueuedPrompt("queued after hang");
    startInteractionForTest(container.interactionManager, {
      kind: "question",
      expectedInput: "mixed",
    });

    await reasonixStopCommand(createContext() as never, createDeps());

    expect(promptQueue.size()).toBe(0);
    expect(container.interactionManager.isActive()).toBe(false);
    expect(mocked.markAttachedSessionIdleMock).toHaveBeenCalledWith("ses-1", expect.anything());
    expect(mocked.clearPromptResponseModeMock).toHaveBeenCalledWith("ses-1");
    expect(mocked.clearPromptResponseModeMock).toHaveBeenCalledWith("ses-2");
  });

  it("reports the command error and skips cleanup when a stop fails", async () => {
    mocked.getRunningInstancesMock.mockReturnValue([{ root: "/repo-a", port: 47610 }]);
    mocked.stopAllInstancesMock.mockRejectedValue(new Error("kill failed"));

    await reasonixStopCommand(createContext() as never, createDeps());

    expect(mocked.clearRuntimeStateMock).not.toHaveBeenCalled();
    expect(mocked.clearAllForegroundMock).not.toHaveBeenCalled();
    expect(mocked.loggerErrorMock).toHaveBeenCalledWith(
      "[Bot] Error in /reasonix_stop command:",
      expect.any(Error),
    );
  });

  it("stops event listening before killing the processes so the reconnect cannot respawn one", async () => {
    const order: string[] = [];
    mocked.getRunningInstancesMock.mockReturnValue([{ root: "/repo-a", port: 47610 }]);
    mocked.stopEventListeningMock.mockImplementation(() => order.push("stopListening"));
    mocked.stopAllInstancesMock.mockImplementation(async () => {
      order.push("stopInstances");
    });

    await reasonixStopCommand(createContext() as never, createDeps());

    expect(order).toEqual(["stopListening", "stopInstances"]);
  });

  it("does not stop event listening when nothing is running", async () => {
    await reasonixStopCommand(createContext() as never, createDeps());

    expect(mocked.stopEventListeningMock).not.toHaveBeenCalled();
  });
});