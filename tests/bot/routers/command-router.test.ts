import { describe, expect, it, vi } from "vitest";
import type { Context, NextFunction } from "grammy";
import { defined } from "../../helpers/defined.js";
import { createTestAppContainer } from "../../helpers/app-container.js";

const mocked = vi.hoisted(() => ({
  flushPendingPrompt: vi.fn(),
  reasonixStopCommand: vi.fn(),
}));

vi.mock("../../../src/bot/handlers/message-merger.js", () => ({
  flushPendingPrompt: mocked.flushPendingPrompt,
  __resetMessageMergerForTests: vi.fn(),
}));

vi.mock("../../../src/bot/commands/reasonix-stop-command.js", () => ({
  reasonixStopCommand: mocked.reasonixStopCommand,
}));

import {
  ensureCommandsInitialized,
  registerCommandRouter,
} from "../../../src/bot/routers/command-router.js";
import { BOT_COMMANDS } from "../../../src/bot/commands/definitions.js";
import { config } from "../../../src/config.js";

describe("bot/routers/command-router", () => {
  it("registers bot slash command handlers", () => {
    const bot = { command: vi.fn(), use: vi.fn() };

    registerCommandRouter(bot as never, {
      container: createTestAppContainer({ ensureEventSubscription: vi.fn(), resetRuntimeStreams: vi.fn() }),
    });

    expect(bot.command.mock.calls.map(([command]) => command)).toEqual([
      "start",
      "help",
      "status",
      "settings",
      "reasonix_start",
      "reasonix_stop",
      "reload",
      "projects",
      "worktree",
      "open",
      "ls",
      "sessions",
      "recent",
      "messages",
      "new",
      "abort",
      "detach",
      "task",
      "tasklist",
      "commands",
      "skills",
    ]);
  });

  it("registers /reload after /reasonix_stop only on V2", async () => {
    vi.stubEnv("REASONIX_SERVER_VERSION", "v2");
    vi.resetModules();
    const router = await import("../../../src/bot/routers/command-router.js");
    const bot = { command: vi.fn(), use: vi.fn() };

    router.registerCommandRouter(bot as never, { container: createTestAppContainer() });

    const commands = bot.command.mock.calls.map(([command]) => command);
    expect(commands.slice(commands.indexOf("reasonix_stop"), commands.indexOf("reasonix_stop") + 2)).toEqual([
      "reasonix_stop",
      "reload",
    ]);

    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("flushes a pending prompt before routing a command", async () => {
    const bot = { command: vi.fn(), use: vi.fn() };
    const next = vi.fn();
    registerCommandRouter(bot as never, {
      container: createTestAppContainer({ ensureEventSubscription: vi.fn(), resetRuntimeStreams: vi.fn() }),
    });
    const middleware = defined(bot.use.mock.calls[0]?.[0]);
    const ctx = { chat: { id: 123 }, message: { text: "/new" } } as unknown as Context;

    await middleware(ctx, next);

    expect(mocked.flushPendingPrompt).toHaveBeenCalledWith(123);
    expect(next).toHaveBeenCalledOnce();
  });

  it("passes the container to the reasonix_stop handler", async () => {
    const bot = { command: vi.fn(), use: vi.fn() };
    const container = createTestAppContainer();
    mocked.reasonixStopCommand.mockReset();
    mocked.reasonixStopCommand.mockResolvedValue(undefined);

    registerCommandRouter(bot as never, { container });

    const stopRegistration = bot.command.mock.calls.find(([command]) => command === "reasonix_stop");
    expect(stopRegistration).toBeDefined();

    const ctx = { chat: { id: 123 } } as unknown as Context;
    await stopRegistration?.[1](ctx);

    expect(mocked.reasonixStopCommand).toHaveBeenCalledWith(ctx, container);
  });

  it("initializes commands for the authorized chat", async () => {
    const next: NextFunction = vi.fn();
    const ctx = {
      from: { id: config.telegram.allowedUserId },
      chat: { id: 123 },
      api: { setMyCommands: vi.fn() },
    } as unknown as Context;

    await ensureCommandsInitialized(ctx, next);

    expect(ctx.api.setMyCommands).toHaveBeenCalledWith(BOT_COMMANDS, {
      scope: { type: "chat", chat_id: 123 },
    });
    expect(next).toHaveBeenCalledOnce();
  });
});
