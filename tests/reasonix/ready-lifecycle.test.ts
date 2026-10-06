import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  loggerDebugMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerWarnMock: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    debug: mocked.loggerDebugMock,
    info: mocked.loggerInfoMock,
    warn: mocked.loggerWarnMock,
  },
}));

import { ReasonixReadyLifecycle } from "../../src/reasonix/ready-lifecycle.js";

let reasonixReadyLifecycle: ReasonixReadyLifecycle;

beforeEach(() => {
  reasonixReadyLifecycle = new ReasonixReadyLifecycle();
});

describe("reasonix/ready-lifecycle", () => {
  beforeEach(() => {
    mocked.loggerDebugMock.mockReset();
    mocked.loggerInfoMock.mockReset();
    mocked.loggerWarnMock.mockReset();
  });

  it("calls ready handlers on unavailable to ready transition", async () => {
    const handler = vi.fn();
    reasonixReadyLifecycle.onReady(handler);

    const emitted = await reasonixReadyLifecycle.notifyReady("startup");

    expect(emitted).toBe(true);
    expect(handler).toHaveBeenCalledWith("startup");
  });

  it("does not call handlers for repeated ready notification", async () => {
    const handler = vi.fn();
    reasonixReadyLifecycle.onReady(handler);

    await reasonixReadyLifecycle.notifyReady("first");
    const emitted = await reasonixReadyLifecycle.notifyReady("second");

    expect(emitted).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("unavailable resets state for the next ready notification", async () => {
    const handler = vi.fn();
    reasonixReadyLifecycle.onReady(handler);

    await reasonixReadyLifecycle.notifyReady("first");
    reasonixReadyLifecycle.notifyUnavailable("offline");
    await reasonixReadyLifecycle.notifyReady("second");

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("logs handler errors and continues running remaining handlers", async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error("boom"));
    const nextHandler = vi.fn();
    reasonixReadyLifecycle.onReady(failingHandler);
    reasonixReadyLifecycle.onReady(nextHandler);

    await reasonixReadyLifecycle.notifyReady("startup");

    expect(nextHandler).toHaveBeenCalledWith("startup");
    expect(mocked.loggerWarnMock).toHaveBeenCalledWith(
      "[ReasonixReady] Ready handler failed: reason=startup",
      expect.any(Error),
    );
  });
});
