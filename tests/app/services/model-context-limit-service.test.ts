import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { statusGetMock, isExpectedServerUnavailableErrorMock } = vi.hoisted(() => ({
  statusGetMock: vi.fn(),
  isExpectedServerUnavailableErrorMock: vi.fn(),
}));

vi.mock("../../../src/reasonix/client.js", () => ({
  reasonixClient: {
    status: {
      get: statusGetMock,
    },
  },
}));

vi.mock("../../../src/utils/reasonix-error.js", () => ({
  isExpectedServerUnavailableError: isExpectedServerUnavailableErrorMock,
}));

vi.mock("../../../src/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  __resetModelContextLimitCacheForTests,
  DEFAULT_CONTEXT_LIMIT,
  getModelContextLimit,
  waitForModelContextLimit,
} from "../../../src/app/services/model-context-limit-service.js";

function statusResponse(window: number) {
  return { data: { window, used: 0 }, error: undefined };
}

function statusFailure(error: unknown = new TypeError("fetch failed")) {
  return { data: undefined, error };
}

describe("app/services/model-context-limit-service", () => {
  beforeEach(() => {
    __resetModelContextLimitCacheForTests();
    statusGetMock.mockReset();
    statusGetMock.mockResolvedValue(statusResponse(1000000));
    isExpectedServerUnavailableErrorMock.mockReset();
    isExpectedServerUnavailableErrorMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the server context window and caches it", async () => {
    await expect(getModelContextLimit("deepseek", "deepseek-v4-flash")).resolves.toBe(1000000);
    await expect(getModelContextLimit("deepseek", "deepseek-v4-flash")).resolves.toBe(1000000);

    expect(statusGetMock).toHaveBeenCalledTimes(1);
  });

  it("returns the default when no model is selected", async () => {
    await expect(getModelContextLimit(null, null)).resolves.toBe(DEFAULT_CONTEXT_LIMIT);
    await expect(getModelContextLimit("deepseek", "")).resolves.toBe(DEFAULT_CONTEXT_LIMIT);

    expect(statusGetMock).not.toHaveBeenCalled();
  });

  it("returns the default when the server reports no window", async () => {
    statusGetMock.mockResolvedValue({ data: { used: 0 }, error: undefined });

    await expect(getModelContextLimit("deepseek", "deepseek-v4-flash")).resolves.toBe(
      DEFAULT_CONTEXT_LIMIT,
    );
  });

  it("returns the default when the status cannot be read", async () => {
    statusGetMock.mockResolvedValue(statusFailure());

    await expect(getModelContextLimit("deepseek", "deepseek-v4-flash")).resolves.toBe(
      DEFAULT_CONTEXT_LIMIT,
    );
  });

  it("keeps a cached window before a failing read inside the TTL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    await expect(getModelContextLimit("deepseek", "deepseek-v4-flash")).resolves.toBe(1000000);

    vi.setSystemTime(new Date("2026-01-01T00:00:30.000Z"));
    statusGetMock.mockResolvedValueOnce(statusFailure());

    await expect(getModelContextLimit("deepseek", "deepseek-v4-flash")).resolves.toBe(1000000);
    expect(statusGetMock).toHaveBeenCalledTimes(1);
  });

  it("reads the window again after the cache expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    await getModelContextLimit("deepseek", "deepseek-v4-flash");

    vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));
    statusGetMock.mockResolvedValueOnce(statusResponse(2000000));

    await expect(getModelContextLimit("deepseek", "deepseek-v4-flash")).resolves.toBe(2000000);
    expect(statusGetMock).toHaveBeenCalledTimes(2);
  });

  describe("waitForModelContextLimit", () => {
    it("reads the window while bypassing the cache", async () => {
      await getModelContextLimit("deepseek", "deepseek-v4-flash");
      statusGetMock.mockResolvedValueOnce(statusResponse(2000000));

      await expect(waitForModelContextLimit("deepseek", "deepseek-v4-flash")).resolves.toBe(2000000);
      expect(statusGetMock).toHaveBeenCalledTimes(2);
    });

    it("returns nothing when the window cannot be read", async () => {
      statusGetMock.mockResolvedValue(statusFailure());

      await expect(waitForModelContextLimit("deepseek", "deepseek-v4-flash")).resolves.toBeNull();
    });

    it("returns nothing without a model", async () => {
      await expect(waitForModelContextLimit("", "")).resolves.toBeNull();

      expect(statusGetMock).not.toHaveBeenCalled();
    });
  });
});