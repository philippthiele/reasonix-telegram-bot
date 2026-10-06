import { reasonixClient } from "./client.js";
import { configuredRoots } from "./instance.js";
import { logger } from "../utils/logger.js";
import { isServerUnavailableError } from "../utils/reasonix-error.js";

export type ReasonixHealth =
  | { healthy: true; version: string | undefined }
  | { healthy: false; error: unknown };

/** "always" logs every time (a user asked); "once" logs a problem once until it changes. */
export type ProblemReportMode = "always" | "once";

/** Why the configured URL did not answer as a Reasonix server. */
export type FailedHealthCause = { kind: "unauthorized" } | { kind: "unknown" };

let lastReportedProblem: string | null = null;

export function describeServerUrl(): string {
  const roots = configuredRoots();
  return roots.length > 0 ? roots.join(", ") : "no configured folder";
}

/** Logs a Reasonix problem; in "once" mode the same problem is not logged again in a row. */
export function reportServerProblem(
  key: string,
  mode: ProblemReportMode,
  report: () => void,
): void {
  if (mode === "once" && lastReportedProblem === key) {
    return;
  }
  lastReportedProblem = key;
  report();
}

/** Tells wrong credentials apart from anything else. */
export async function classifyFailedHealthCheck(): Promise<FailedHealthCause> {
  const { error } = await reasonixClient.global.health();
  if (error && (error as { status?: number }).status === 401) {
    return { kind: "unauthorized" };
  }
  return { kind: "unknown" };
}

/** Writes the log line for a failed health check cause; an unknown cause logs nothing. */
export function reportFailedHealthCause(cause: FailedHealthCause, mode: ProblemReportMode): void {
  if (cause.kind === "unauthorized") {
    reportServerProblem("unauthorized", mode, () =>
      logger.warn(
        `[Reasonix] Authentication failed for ${describeServerUrl()}: check REASONIX_SERVER_USERNAME and REASONIX_SERVER_PASSWORD`,
      ),
    );
  }
}

/** Explains a failed health check in the log; an unknown cause logs nothing. */
export async function explainFailedHealthCheck(mode: ProblemReportMode): Promise<void> {
  let cause: FailedHealthCause;
  try {
    cause = await classifyFailedHealthCheck();
  } catch {
    // Classifying needs a second call to the server; if that one fails too there is
    // nothing to tell apart, and a health report must not fail because of its own log line.
    return;
  }
  reportFailedHealthCause(cause, mode);
}

/**
 * Health of the Reasonix servers for the configured folders. A folder that does not
 * answer counts as unhealthy, since every configured folder has to be reachable.
 */
export async function checkReasonixHealth(): Promise<ReasonixHealth> {
  let error: unknown;
  try {
    const result = await reasonixClient.global.health();
    if (!result.error && result.data?.healthy === true) {
      lastReportedProblem = null;
      return { healthy: true, version: result.data.version };
    }
    error = result.error ?? new Error("Unexpected Reasonix health response");
  } catch (caught) {
    error = caught;
  }

  if (!isServerUnavailableError(error)) {
    await explainFailedHealthCheck("once");
  }
  return { healthy: false, error };
}

export function __resetServerHealthStateForTests(): void {
  lastReportedProblem = null;
}
