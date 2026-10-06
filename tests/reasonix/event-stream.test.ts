import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@opencode-ai/sdk/v2";

const mocked = vi.hoisted(() => ({
  subscribe: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("../../src/reasonix/client.js", () => ({
  reasonixClient: { event: { subscribe: mocked.subscribe } },
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: mocked.loggerWarn,
    error: mocked.loggerError,
  },
}));

import {
  __setSseIdleTimeoutForTests,
  stopEventListening,
  subscribeToEvents,
  type EventEnvelope,
} from "../../src/reasonix/event-stream.js";

const DIRECTORY = "/home/user/project";

function event(type: string, properties: Record<string, unknown> = {}): Event {
  return { type, properties } as unknown as Event;
}

function envelope(type: string, properties: Record<string, unknown> = {}): EventEnvelope {
  return { directory: DIRECTORY, event: event(type, properties) };
}

/** Yields the given events and then stays open until the listener aborts it. */
function createStream(events: unknown[]): AsyncGenerator<unknown> {
  return (async function* () {
    for (const item of events) {
      yield item;
    }
    await new Promise<void>(() => {});
  })();
}

/** Yields the given events and then ends the stream. */
function createEndingStream(events: unknown[]): AsyncGenerator<unknown> {
  return (async function* () {
    for (const item of events) {
      yield item;
    }
  })();
}

describe("reasonix/event-stream", () => {
  beforeEach(() => {
    mocked.subscribe.mockReset();
    mocked.loggerError.mockReset();
    mocked.loggerWarn.mockReset();
  });

  afterEach(() => {
    stopEventListening();
    vi.useRealTimers();
  });

  it("subscribes to the stream and forwards events to the callback", async () => {
    const callback = vi.fn();
    mocked.subscribe.mockResolvedValue({ data: { stream: createStream([envelope("session.idle")]) } });

    void subscribeToEvents(DIRECTORY, callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));

    expect(mocked.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ directory: DIRECTORY, signal: expect.any(AbortSignal) }),
    );
    expect(callback).toHaveBeenCalledWith({ directory: DIRECTORY, event: event("session.idle") });
  });

  it("ignores events with an unknown shape", async () => {
    const callback = vi.fn();
    mocked.subscribe.mockResolvedValue({
      data: {
        stream: createStream([{ nope: true }, { directory: DIRECTORY, event: { type: "x" } }, envelope("session.idle")]),
      },
    });

    void subscribeToEvents(DIRECTORY, callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));

    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ event: event("session.idle") }));
  });

  it("does not create a duplicate subscription for the same directory while active", async () => {
    mocked.subscribe.mockResolvedValue({ data: { stream: createStream([]) } });

    void subscribeToEvents(DIRECTORY, vi.fn());
    await vi.waitFor(() => expect(mocked.subscribe).toHaveBeenCalledTimes(1));
    await subscribeToEvents(DIRECTORY, vi.fn());

    expect(mocked.subscribe).toHaveBeenCalledTimes(1);
  });

  it("aborts the previous stream when the directory changes", async () => {
    const firstSignal: { aborted: boolean } = { aborted: false };
    mocked.subscribe.mockImplementation(async (params: { signal: AbortSignal; directory: string }) => {
      if (params.directory === DIRECTORY) {
        params.signal.addEventListener("abort", () => {
          firstSignal.aborted = true;
        });
        return { data: { stream: createStream([]) } };
      }
      return { data: { stream: createStream([]) } };
    });

    void subscribeToEvents(DIRECTORY, vi.fn());
    await vi.waitFor(() => expect(mocked.subscribe).toHaveBeenCalledTimes(1));
    void subscribeToEvents("/home/user/other", vi.fn());

    await vi.waitFor(() => expect(firstSignal.aborted).toBe(true));
    expect(mocked.subscribe).toHaveBeenLastCalledWith(
      expect.objectContaining({ directory: "/home/user/other" }),
    );
  });

  it("logs callback errors without failing event delivery", async () => {
    const callback = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("callback blew up");
      })
      .mockImplementation(() => undefined);
    mocked.subscribe.mockResolvedValue({
      data: { stream: createStream([envelope("session.idle"), envelope("session.idle")]) },
    });

    void subscribeToEvents(DIRECTORY, callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(2));

    expect(mocked.loggerError).toHaveBeenCalledWith("[Events] Callback failed:", expect.any(Error));
  });

  it("subscribes again after the stream ends and reports the drop once the new stream delivers", async () => {
    vi.useFakeTimers();
    const reconnect = vi.fn();
    mocked.subscribe
      .mockResolvedValueOnce({ data: { stream: createEndingStream([envelope("session.idle")]) } })
      .mockResolvedValue({
        data: { stream: createStream([envelope("server.connected", { restarted: false })]) },
      });

    void subscribeToEvents(DIRECTORY, vi.fn(), reconnect);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocked.subscribe).toHaveBeenCalledTimes(1);
    expect(reconnect).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(mocked.subscribe).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10);
    expect(reconnect).toHaveBeenCalledWith({ serverRestarted: false });
    expect(mocked.loggerWarn).toHaveBeenCalledWith(expect.stringContaining("reconnecting in 1000ms"));
  });

  it("reports whether the server restarted when the stream reconnects by itself", async () => {
    const reconnect = vi.fn();
    mocked.subscribe.mockResolvedValue({
      data: {
        stream: createStream([
          envelope("server.connected"),
          envelope("server.connected", { restarted: true }),
        ]),
      },
    });

    void subscribeToEvents(DIRECTORY, vi.fn(), reconnect);
    await vi.waitFor(() => expect(reconnect).toHaveBeenCalledTimes(1));

    expect(reconnect).toHaveBeenCalledWith({ serverRestarted: true });
  });

  it("does not report a reconnect for the first connect event", async () => {
    const reconnect = vi.fn();
    mocked.subscribe.mockResolvedValue({
      data: { stream: createStream([envelope("server.connected", { restarted: false })]) },
    });

    void subscribeToEvents(DIRECTORY, vi.fn(), reconnect);
    await vi.waitFor(() => expect(mocked.subscribe).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(reconnect).not.toHaveBeenCalled();
  });

  it("retries after an idle timeout", async () => {
    vi.useFakeTimers();
    __setSseIdleTimeoutForTests(50);
    mocked.subscribe
      .mockResolvedValueOnce({ data: { stream: createStream([]) } })
      .mockResolvedValue({ data: { stream: createStream([]) } });

    void subscribeToEvents(DIRECTORY, vi.fn());
    await vi.advanceTimersByTimeAsync(50);

    expect(mocked.loggerWarn).toHaveBeenCalledWith(expect.stringContaining("idle timeout"));
    expect(mocked.subscribe).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mocked.subscribe).toHaveBeenCalledTimes(2);

    __setSseIdleTimeoutForTests(30_000);
  });

  it("gives up when the subscription returns no stream", async () => {
    mocked.subscribe.mockResolvedValue({});

    await expect(subscribeToEvents(DIRECTORY, vi.fn())).rejects.toThrow(
      "No stream returned from event subscription",
    );
  });

  it("stops the listener and ignores later events", async () => {
    const callback = vi.fn();
    mocked.subscribe.mockResolvedValue({
      data: { stream: createStream([envelope("session.idle"), envelope("session.idle")]) },
    });

    void subscribeToEvents(DIRECTORY, callback);
    stopEventListening();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(callback).not.toHaveBeenCalled();
  });
});