import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  restartAllInstances: vi.fn(),
  refreshModelCatalogAfterConfigReload: vi.fn(),
  getStoredModel: vi.fn(),
}));

vi.mock("../../../src/reasonix/instance.js", () => ({
  restartAllInstances: mocked.restartAllInstances,
}));

vi.mock("../../../src/reasonix/ready-refresh.js", () => ({
  refreshModelCatalogAfterConfigReload: mocked.refreshModelCatalogAfterConfigReload,
}));

vi.mock("../../../src/app/services/model-selection-service.js", () => ({
  getStoredModel: mocked.getStoredModel,
}));

import { reloadReasonixConfig } from "../../../src/app/services/config-reload-service.js";

const STORED_MODEL = { providerID: "anthropic", modelID: "claude", variant: "default" };
const FALLBACK_MODEL = { providerID: "test-provider", modelID: "test-model", variant: "default" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("app/services/config-reload-service", () => {
  beforeEach(() => {
    mocked.restartAllInstances.mockResolvedValue(2);
    mocked.refreshModelCatalogAfterConfigReload.mockResolvedValue(undefined);
    mocked.getStoredModel.mockReturnValue(STORED_MODEL);
  });

  it("refreshes the model catalog after a successful reload", async () => {
    const result = await reloadReasonixConfig();

    expect(result).toEqual({ kind: "success", modelChanged: false });
    expect(mocked.restartAllInstances).toHaveBeenCalledOnce();
    expect(mocked.refreshModelCatalogAfterConfigReload).toHaveBeenCalledOnce();
  });

  it("reports a model the catalog refresh replaced", async () => {
    mocked.refreshModelCatalogAfterConfigReload.mockImplementation(async () => {
      mocked.getStoredModel.mockReturnValue(FALLBACK_MODEL);
    });

    await expect(reloadReasonixConfig()).resolves.toEqual({ kind: "success", modelChanged: true });
  });

  it("still reports success when the catalog refresh fails", async () => {
    mocked.refreshModelCatalogAfterConfigReload.mockRejectedValue(new Error("catalog down"));

    await expect(reloadReasonixConfig()).resolves.toEqual({ kind: "success", modelChanged: false });
  });

  it("reports the restart's own message when it fails", async () => {
    mocked.restartAllInstances.mockRejectedValue(new Error("the port is still in use"));

    await expect(reloadReasonixConfig()).resolves.toEqual({
      kind: "failed",
      error: "the port is still in use",
    });
    expect(mocked.refreshModelCatalogAfterConfigReload).not.toHaveBeenCalled();
  });

  it("reports a failure that is not an Error without an error text", async () => {
    mocked.restartAllInstances.mockRejectedValue({});

    await expect(reloadReasonixConfig()).resolves.toEqual({
      kind: "failed",
      error: "[object Object]",
    });
  });

  it("succeeds with nothing to do when no instance was running", async () => {
    mocked.restartAllInstances.mockResolvedValue(0);

    await expect(reloadReasonixConfig()).resolves.toEqual({ kind: "success", modelChanged: false });
    expect(mocked.refreshModelCatalogAfterConfigReload).toHaveBeenCalledOnce();
  });

  it("joins a reload that is already in flight", async () => {
    const pending = deferred<number>();
    mocked.restartAllInstances.mockReturnValue(pending.promise);

    const first = reloadReasonixConfig();
    const second = reloadReasonixConfig();
    pending.resolve(1);

    await expect(first).resolves.toEqual({ kind: "success", modelChanged: false });
    await expect(second).resolves.toEqual({ kind: "success", modelChanged: false });
    expect(mocked.restartAllInstances).toHaveBeenCalledOnce();

    await reloadReasonixConfig();
    expect(mocked.restartAllInstances).toHaveBeenCalledTimes(2);
  });

  it("times out without abandoning the catalog refresh of a late success", async () => {
    vi.useFakeTimers();
    const pending = deferred<number>();
    mocked.restartAllInstances.mockReturnValueOnce(pending.promise);

    const result = reloadReasonixConfig();
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(result).resolves.toEqual({ kind: "timeout" });

    const retry = reloadReasonixConfig();
    await expect(retry).resolves.toEqual({ kind: "success", modelChanged: false });
    expect(mocked.restartAllInstances).toHaveBeenCalledTimes(2);

    pending.resolve(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocked.refreshModelCatalogAfterConfigReload).toHaveBeenCalledTimes(2);
  });
});
