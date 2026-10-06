import { restartAllInstances } from "../../reasonix/instance.js";
import { refreshModelCatalogAfterConfigReload } from "../../reasonix/ready-refresh.js";
import type { ModelInfo } from "../types/model.js";
import { logger } from "../../utils/logger.js";
import { getStoredModel } from "./model-selection-service.js";

// A restart takes as long as the last serve process needs to let go of its port.
const CONFIG_RELOAD_TIMEOUT_MS = 60_000;

export type ConfigReloadResult =
  | { kind: "success"; modelChanged: boolean }
  | { kind: "failed"; error: string | null }
  | { kind: "timeout" };

let reloadInFlight: Promise<ConfigReloadResult> | null = null;

function isSameModel(left: ModelInfo, right: ModelInfo): boolean {
  return (
    left.providerID === right.providerID &&
    left.modelID === right.modelID &&
    left.variant === right.variant
  );
}

async function reloadAndRefreshModelCatalog(): Promise<ConfigReloadResult> {
  let restarted: number;
  try {
    restarted = await restartAllInstances();
  } catch (error) {
    logger.warn("[ConfigReload] Could not restart the Reasonix instances", error);
    return { kind: "failed", error: error instanceof Error ? error.message : String(error) };
  }

  logger.info(
    restarted === 0
      ? "[ConfigReload] No Reasonix instance was running; the new settings apply on the next message"
      : `[ConfigReload] Restarted ${restarted} Reasonix instance(s)`,
  );

  const modelBefore = { ...getStoredModel() };
  try {
    await refreshModelCatalogAfterConfigReload();
  } catch (refreshError) {
    logger.warn("[ConfigReload] Failed to refresh the model catalog after reload", refreshError);
  }

  return { kind: "success", modelChanged: !isSameModel(modelBefore, getStoredModel()) };
}

function startReload(): Promise<ConfigReloadResult> {
  const operation = reloadAndRefreshModelCatalog().finally(() => {
    if (reloadInFlight === operation) {
      reloadInFlight = null;
    }
  });
  reloadInFlight = operation;
  return operation;
}

/**
 * Puts the changed configuration into effect and re-reads the model catalog
 * afterwards. A call made while a reload is in flight joins it. The time limit
 * ends only the wait: a reload that succeeds later still refreshes the catalog,
 * and the next call starts afresh.
 */
export async function reloadReasonixConfig(): Promise<ConfigReloadResult> {
  const operation = reloadInFlight ?? startReload();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ConfigReloadResult>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), CONFIG_RELOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([operation, timeout]);
    if (result.kind === "timeout") {
      logger.warn(`[ConfigReload] Config reload timed out after ${CONFIG_RELOAD_TIMEOUT_MS}ms`);
      if (reloadInFlight === operation) {
        reloadInFlight = null;
      }
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

export function __resetConfigReloadForTests(): void {
  reloadInFlight = null;
}
