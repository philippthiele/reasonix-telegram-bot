import { logger } from "../utils/logger.js";

/**
 * The error every failing Reasonix call rejects with, so feature code can tell a
 * Reasonix failure from a bug in the adapter.
 */
export class ReasonixRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ReasonixRequestError";
  }
}

/** A Reasonix call that timed out before the server answered. */
export class ReasonixTimeoutError extends Error {
  constructor(
    readonly endpoint: string,
    readonly timeoutMs: number,
  ) {
    super(`Reasonix request to ${endpoint} timed out after ${timeoutMs}ms`);
    this.name = "ReasonixTimeoutError";
  }
}

export interface ReasonixRequestOptions {
  /** Query string values; `undefined` and `null` entries are dropped. */
  query?: Record<string, string | number | boolean | undefined | null> | undefined;
  /** JSON body. Reasonix expects `null` to clear a value, so it is kept. */
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;

function buildUrl(
  baseUrl: string,
  endpoint: string,
  query: ReasonixRequestOptions["query"],
): string {
  const url = new URL(endpoint, baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function describeBody(body: unknown): string {
  if (typeof body === "string") {
    return body.slice(0, 300);
  }
  try {
    return JSON.stringify(body).slice(0, 300);
  } catch {
    return "<unserializable body>";
  }
}

/** Reads the server's own error message so the log says what went wrong. */
function extractErrorMessage(body: unknown): string | null {
  if (typeof body === "string") {
    return body.slice(0, 300);
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["error", "message", "detail"]) {
      const value = record[key];
      if (typeof value === "string") {
        return value.slice(0, 300);
      }
    }
  }
  return null;
}

/**
 * One authenticated HTTP call against `reasonix serve`.
 *
 * Every Reasonix route needs the launch token as a bearer credential, so the
 * token lives here instead of at each call site. 204 and 202 answers resolve to
 * `undefined`; callers that need the body's shape read it from `data`.
 */
export async function request<T>(
  baseUrl: string,
  token: string,
  endpoint: string,
  options: ReasonixRequestOptions = {},
): Promise<T | undefined> {
  const url = buildUrl(baseUrl, endpoint, options.query);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const onAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(
    () => controller.abort(new ReasonixTimeoutError(endpoint, timeoutMs)),
    timeoutMs,
  );

  try {
    const response = await fetch(url, {
      method: options.body === undefined ? "GET" : "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let parsed: unknown;
    if (raw.length > 0) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }

    if (!response.ok) {
      const detail = extractErrorMessage(parsed) ?? describeBody(parsed);
      throw new ReasonixRequestError(
        `Reasonix ${response.status} on ${endpoint}${detail ? `: ${detail}` : ""}`,
        response.status,
        endpoint,
        parsed,
      );
    }

    return parsed as T | undefined;
  } catch (error) {
    if (error instanceof ReasonixRequestError) {
      throw error;
    }
    if (controller.signal.reason instanceof ReasonixTimeoutError) {
      throw controller.signal.reason;
    }
    if (options.signal?.aborted) {
      throw options.signal.reason ?? new Error(`Reasonix request to ${endpoint} was aborted`);
    }
    throw new ReasonixRequestError(
      `Reasonix request to ${endpoint} failed: ${error instanceof Error ? error.message : String(error)}`,
      0,
      endpoint,
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Opens the SSE stream and yields every `data:` payload until the connection
 * ends. Reasonix sends no event names, so the stream is parsed by hand instead
 * of through `EventSource`, which cannot send an Authorization header.
 */
export async function* streamEvents(
  baseUrl: string,
  token: string,
  endpoint: string,
  signal: AbortSignal,
): AsyncGenerator<unknown, void, unknown> {
  const response = await fetch(buildUrl(baseUrl, endpoint, undefined), {
    headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" },
    signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new ReasonixRequestError(
      `Reasonix event stream failed with ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      response.status,
      endpoint,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      buffer += decoder.decode(value, { stream: true });

      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const chunk = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        const payload = parseEventChunk(chunk);
        if (payload !== undefined) {
          yield payload;
        }
        separator = buffer.indexOf("\n\n");
      }
    }
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    throw error;
  } finally {
    void reader.cancel().catch(() => undefined);
  }
}

function parseEventChunk(chunk: string): unknown {
  const data = chunk
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (data.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(data);
  } catch (error) {
    logger.debug(`[ReasonixHttp] Skipping unparsable SSE frame: ${String(error)}`);
    return undefined;
  }
}
