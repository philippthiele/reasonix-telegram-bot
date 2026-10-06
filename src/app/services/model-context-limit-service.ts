import { reasonixClient } from "../../reasonix/client.js";
import { logger } from "../../utils/logger.js";
import { isExpectedServerUnavailableError } from "../../utils/reasonix-error.js";

export const DEFAULT_CONTEXT_LIMIT = 200000;

const WINDOW_CACHE_TTL_MS = 60 * 1000;

/**
 * Reasonix reports the context window of the model it currently runs through
 * `GET /status`; `GET /models` carries no limit, so the window is cached here
 * and shared by every caller. A model switch changes it, so the cache is short.
 */
let cachedWindow: number | null = null;
let windowCacheExpiresAt = 0;
let windowFetchInFlight: Promise<number | null> | null = null;

async function readContextWindow(force = false): Promise<number | null> {
  if (!force && cachedWindow !== null && Date.now() < windowCacheExpiresAt) {
    return cachedWindow;
  }

  if (windowFetchInFlight) {
    return windowFetchInFlight;
  }

  windowFetchInFlight = (async () => {
    try {
      const { data, error } = await reasonixClient.status.get();

      if (error || !data) {
        if (isExpectedServerUnavailableError(error)) {
          logger.warn("[ModelContextLimit] Reasonix server unavailable; using default context limit");
        } else {
          logger.warn("[ModelContextLimit] Failed to read context window:", error);
        }
        return cachedWindow;
      }

      const window = data.window;
      if (typeof window === "number" && window > 0) {
        cachedWindow = window;
        windowCacheExpiresAt = Date.now() + WINDOW_CACHE_TTL_MS;
        logger.debug(`[ModelContextLimit] Context window: ${window}`);
        return window;
      }

      return cachedWindow;
    } catch (error) {
      if (isExpectedServerUnavailableError(error)) {
        logger.warn("[ModelContextLimit] Reasonix server unavailable; using default context limit");
      } else {
        logger.warn("[ModelContextLimit] Error reading context window:", error);
      }
      return cachedWindow;
    } finally {
      windowFetchInFlight = null;
    }
  })();

  return windowFetchInFlight;
}

export async function getModelContextLimit(
  providerID?: string | null,
  modelID?: string | null,
): Promise<number> {
  if (!providerID || !modelID) {
    return DEFAULT_CONTEXT_LIMIT;
  }

  const window = await readContextWindow();
  return window ?? DEFAULT_CONTEXT_LIMIT;
}

/**
 * Read the context window once more, bypassing the cache. Used to fill in the
 * limit of a model that was not known when the dashboard was first drawn.
 * @returns The limit, or null when the server cannot report it
 */
export async function waitForModelContextLimit(
  providerID: string,
  modelID: string,
): Promise<number | null> {
  if (!providerID || !modelID) {
    return null;
  }

  return readContextWindow(true);
}

export function __resetModelContextLimitCacheForTests(): void {
  cachedWindow = null;
  windowCacheExpiresAt = 0;
  windowFetchInFlight = null;
}