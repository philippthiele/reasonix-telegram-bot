import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { t } from "../../../src/i18n/index.js";

const mocked = vi.hoisted(() => ({
  healthMock: vi.fn(),
  getActiveRootMock: vi.fn(),
  getRunningInstancesMock: vi.fn(),
  getInstanceMock: vi.fn(),
  configuredRootsMock: vi.fn(),
  notifyReadyMock: vi.fn(),
  notifyUnavailableMock: vi.fn(),
  editBotTextMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock("../../../src/reasonix/client.js", () => ({
  reasonixClient: {
    global: { health: mocked.healthMock },
    getActiveRoot: mocked.getActiveRootMock,
  },
}));

vi.mock("../../../src/reasonix/instance.js", () => ({
  getRunningInstances: mocked.getRunningInstancesMock,
  getInstance: mocked.getInstanceMock,
  configuredRoots: mocked.configuredRootsMock,
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

import { reasonixStartCommand } from "../../../src/bot/commands/reasonix-start-command.js";
import { createTestAppContainer } from "../../helpers/app-container.js";

const ROOT = "/home/user/repo";
const HEALTHY = { data: { healthy: true, version: "1.39.7" }, error: null };

function createContext(): Context {
  return {
    chat: { id: 42, type: "private" },
    api: {},
    reply: vi.fn().mockResolvedValue({ message_id: 10 }),
  } as unknown as Context;
}

function createDeps() {
  return createTestAppContainer({
    reasonixReadyLifecycle: {
      notifyReady: mocked.notifyReadyMock,
      notifyUnavailable: mocked.notifyUnavailableMock,
    } as never,
  });
}

describe("bot/commands/reasonix-start-command", () => {
  beforeEach(() => {
    mocked.healthMock.mockReset().mockResolvedValue(HEALTHY);
    mocked.getActiveRootMock.mockReset().mockReturnValue(ROOT);
    mocked.getRunningInstancesMock.mockReset().mockReturnValue([]);
    mocked.getInstanceMock.mockReset().mockResolvedValue({ root: ROOT, port: 47610 });
    mocked.configuredRootsMock.mockReset().mockReturnValue([ROOT]);
    mocked.notifyReadyMock.mockReset().mockResolvedValue(true);
    mocked.notifyUnavailableMock.mockReset().mockResolvedValue(true);
    mocked.editBotTextMock.mockReset().mockResolvedValue(undefined);
    mocked.loggerInfoMock.mockReset();
    mocked.loggerErrorMock.mockReset();
  });

  it("warns when running in a container", async () => {
    const ctx = createContext();
    vi.stubEnv("REASONIX_TELEGRAM_CONTAINER", "1");

    await reasonixStartCommand(ctx as never, createDeps());

    expect(ctx.reply).toHaveBeenCalledWith(t("runtime.container.command_unavailable"));
    expect(mocked.getInstanceMock).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("reports the running instance for the active root without starting another", async () => {
    const ctx = createContext();
    mocked.getRunningInstancesMock.mockReturnValue([{ root: ROOT, port: 47610 }]);

    await reasonixStartCommand(ctx as never, createDeps());

    expect(ctx.reply).toHaveBeenCalledWith(
      t("reasonix_start.already_running", { version: "1.39.7" }),
    );
    expect(mocked.getInstanceMock).not.toHaveBeenCalled();
    expect(mocked.notifyReadyMock).toHaveBeenCalledWith("reasonix_start_already_running");
  });

  it("does not treat another root's instance as already running", async () => {
    mocked.getRunningInstancesMock.mockReturnValue([{ root: "/home/user/other", port: 47611 }]);

    await reasonixStartCommand(createContext() as never, createDeps());

    expect(mocked.getInstanceMock).toHaveBeenCalledWith(ROOT);
  });

  it("starts the instance for the active root and reports its root and port", async () => {
    const ctx = createContext();

    await reasonixStartCommand(ctx as never, createDeps());

    expect(mocked.getInstanceMock).toHaveBeenCalledWith(ROOT);
    expect(ctx.reply).toHaveBeenCalledWith(t("reasonix_start.starting"));
    expect(mocked.editBotTextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        text: t("reasonix_start.success", {
          root: ROOT,
          port: 47610,
          version: "1.39.7",
        }),
      }),
    );
    expect(mocked.notifyReadyMock).toHaveBeenCalledWith("reasonix_start_success");
  });

  it("marks the server unavailable before starting it, so the start runs the ready refresh", async () => {
    await reasonixStartCommand(createContext() as never, createDeps());

    expect(mocked.notifyUnavailableMock).toHaveBeenCalledWith("reasonix_start_not_running");
    const unavailableOrder = mocked.notifyUnavailableMock.mock.invocationCallOrder[0] ?? 0;
    const readyOrder = mocked.notifyReadyMock.mock.invocationCallOrder[0] ?? 0;
    expect(unavailableOrder).toBeLessThan(readyOrder);
  });

  it("reports the start error and marks nothing ready when the spawn fails", async () => {
    const ctx = createContext();
    mocked.getInstanceMock.mockRejectedValue(new Error("spawn reasonix ENOENT"));

    await reasonixStartCommand(ctx as never, createDeps());

    expect(mocked.editBotTextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        text: t("reasonix_start.start_error", { error: "Error: spawn reasonix ENOENT" }),
      }),
    );
    expect(mocked.notifyReadyMock).not.toHaveBeenCalled();
  });

  it("reports command error when ready lifecycle fails unexpectedly", async () => {
    mocked.notifyReadyMock.mockRejectedValue(new Error("ready failed"));

    await reasonixStartCommand(createContext() as never, createDeps());

    expect(mocked.loggerErrorMock).toHaveBeenCalledWith(
      "[Bot] Error in /reasonix_start command:",
      expect.any(Error),
    );
  });
});