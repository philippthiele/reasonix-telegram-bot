import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  configMock,
  providersMock,
  promptAsyncMock,
  getCurrentSessionMock,
  getCurrentModelMock,
  setCurrentModelMock,
  setCurrentModelState,
  getCurrentModelState,
  resetCurrentModelState,
  loggerInfoMock,
  loggerWarnMock,
  loggerErrorMock,
  loggerDebugMock,
} = vi.hoisted(() => {
  let currentModel: { providerID: string; modelID: string; variant?: string } | undefined;

  const getCurrentModelMock = vi.fn(() => currentModel);
  const setCurrentModelMock = vi.fn(
    (modelInfo: { providerID: string; modelID: string; variant?: string }) => {
      currentModel = modelInfo;
    },
  );

  return {
    configMock: {
      reasonix: {
        model: {
          provider: "opencode",
          modelId: "big-pickle",
        },
      },
    },
    providersMock: vi.fn(),
    promptAsyncMock: vi.fn(),
    getCurrentSessionMock: vi.fn(),
    getCurrentModelMock,
    setCurrentModelMock,
    setCurrentModelState: (modelInfo?: {
      providerID: string;
      modelID: string;
      variant?: string;
    }) => {
      currentModel = modelInfo;
    },
    getCurrentModelState: () => currentModel,
    resetCurrentModelState: () => {
      currentModel = undefined;
      getCurrentModelMock.mockClear();
      setCurrentModelMock.mockClear();
    },
    loggerInfoMock: vi.fn(),
    loggerWarnMock: vi.fn(),
    loggerErrorMock: vi.fn(),
    loggerDebugMock: vi.fn(),
  };
});

vi.mock("../../../src/config.js", () => ({
  config: configMock,
}));

vi.mock("../../../src/reasonix/client.js", () => ({
  reasonixClient: {
    config: {
      providers: providersMock,
    },
    session: {
      promptAsync: promptAsyncMock,
    },
  },
}));

vi.mock("../../../src/app/services/session-service.js", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("../../../src/app/stores/settings-store.js", () => ({
  getCurrentModel: getCurrentModelMock,
  setCurrentModel: setCurrentModelMock,
}));

vi.mock("../../../src/utils/logger.js", () => ({
  logger: {
    info: loggerInfoMock,
    warn: loggerWarnMock,
    error: loggerErrorMock,
    debug: loggerDebugMock,
  },
}));

import {
  __resetModelCatalogCacheForTests,
  applyModelToReasonix,
  getModelAvailability,
  getModelSelectionLists,
  getMissingExpectedProviders,
  getProviderModels,
  getProviders,
  readProvidersWhenListed,
  reconcileStoredModelSelection,
  resolveModelToAdopt,
  searchModels,
  startModelCatalogWarmup,
} from "../../../src/app/services/model-selection-service.js";

function createProvidersResponse(modelsByProvider: Record<string, string[]>) {
  return {
    data: {
      providers: Object.entries(modelsByProvider).map(([providerID, modelIDs]) => ({
        id: providerID,
        models: Object.fromEntries(modelIDs.map((modelID) => [modelID, { id: modelID }])),
      })),
    },
    error: null,
  };
}

describe("app/services/model-selection-service", () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetCurrentModelState();
    __resetModelCatalogCacheForTests();

    loggerInfoMock.mockReset();
    loggerWarnMock.mockReset();
    loggerErrorMock.mockReset();
    loggerDebugMock.mockReset();

    providersMock.mockReset();
    providersMock.mockResolvedValue(
      createProvidersResponse({
        opencode: ["big-pickle"],
        openai: ["gpt-4o", "gpt-3.5"],
        anthropic: ["claude-sonnet"],
        google: ["gemini-pro"],
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getModelSelectionLists", () => {
    it("returns the config model as the only favorite when none is stored", async () => {
      const result = await getModelSelectionLists();

      expect(result.favorites).toEqual([{ providerID: "opencode", modelID: "big-pickle" }]);
      expect(result.recent).toEqual([]);
    });

    it("returns the stored model instead of the config model", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });

      const result = await getModelSelectionLists();

      expect(result.favorites).toEqual([{ providerID: "openai", modelID: "gpt-4o" }]);
      expect(result.recent).toEqual([]);
    });

    it("hides the stored model when Reasonix does not offer it", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "retired", variant: "high" });

      const result = await getModelSelectionLists();

      expect(result.favorites).toEqual([]);
      expect(result.recent).toEqual([]);
    });

    it("returns empty lists when no model is stored and the config model is missing", async () => {
      configMock.reasonix.model.provider = "";
      configMock.reasonix.model.modelId = "";

      const result = await getModelSelectionLists();

      expect(result.favorites).toEqual([]);
      expect(result.recent).toEqual([]);

      configMock.reasonix.model.provider = "opencode";
      configMock.reasonix.model.modelId = "big-pickle";
    });

    it("shows the config model when the catalog cannot be read", async () => {
      providersMock.mockResolvedValue({ data: null, error: new Error("fetch failed") });

      const result = await getModelSelectionLists();

      expect(result.favorites).toEqual([{ providerID: "opencode", modelID: "big-pickle" }]);
    });

    it("uses the model catalog cache between repeated calls", async () => {
      await getModelSelectionLists();
      await getModelSelectionLists();

      expect(providersMock).toHaveBeenCalledTimes(1);
    });

    it("falls back to the stale model catalog cache when refresh fails", async () => {
      const startTime = new Date("2026-01-01T00:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(startTime);
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });

      const first = await getModelSelectionLists();
      expect(first.favorites).toEqual([{ providerID: "openai", modelID: "gpt-4o" }]);

      providersMock.mockResolvedValueOnce({ data: null, error: new Error("upstream unavailable") });
      vi.setSystemTime(new Date(startTime.getTime() + 11 * 60 * 1000));

      const second = await getModelSelectionLists();

      expect(providersMock).toHaveBeenCalledTimes(2);
      expect(second.favorites).toEqual([{ providerID: "openai", modelID: "gpt-4o" }]);
    });
  });

  describe("reconcileStoredModelSelection", () => {
    it("logs a short warning without stack when the Reasonix server is unavailable", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });
      providersMock.mockResolvedValueOnce({ data: null, error: new TypeError("fetch failed") });

      await reconcileStoredModelSelection();

      expect(loggerWarnMock).toHaveBeenCalledWith(
        "[ModelManager] Reasonix server is not running; skipping model catalog refresh",
      );
      expect(loggerWarnMock).not.toHaveBeenCalledWith(
        "[ModelManager] Failed to refresh model catalog:",
        expect.any(Error),
      );
      expect(loggerWarnMock).toHaveBeenCalledWith(
        "[ModelManager] Skipping stored model validation: model catalog unavailable",
      );
      expect(setCurrentModelMock).not.toHaveBeenCalled();
    });

    it("forces model catalog refresh when requested", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });

      await reconcileStoredModelSelection();
      await reconcileStoredModelSelection({ forceCatalogRefresh: true });

      expect(providersMock).toHaveBeenCalledTimes(2);
    });

    it("falls back to env default when stored model is unavailable", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "retired", variant: "high" });

      await reconcileStoredModelSelection();

      expect(getCurrentModelState()).toEqual({
        providerID: "opencode",
        modelID: "big-pickle",
        variant: "default",
      });
      expect(setCurrentModelMock).toHaveBeenCalledTimes(1);
    });

    it("keeps stored model when it is available", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });

      await reconcileStoredModelSelection();

      expect(getCurrentModelState()).toEqual({
        providerID: "openai",
        modelID: "gpt-4o",
        variant: "high",
      });
      expect(setCurrentModelMock).not.toHaveBeenCalled();
    });

    it("reports a non-empty catalog as available", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });

      await expect(reconcileStoredModelSelection({ forceCatalogRefresh: true })).resolves.toEqual({
        catalogAvailable: true,
        catalogComplete: true,
        selectedModelListed: true,
        storedModelReplaced: false,
      });
    });

    it("reports the catalog even when no model is stored", async () => {
      await expect(
        reconcileStoredModelSelection({ forceCatalogRefresh: true }),
      ).resolves.toMatchObject({ catalogAvailable: true, selectedModelListed: true });
      expect(providersMock).toHaveBeenCalledTimes(1);
    });

    it("reports a replaced stored model", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "retired", variant: "high" });

      await expect(reconcileStoredModelSelection()).resolves.toEqual({
        catalogAvailable: true,
        catalogComplete: true,
        selectedModelListed: true,
        storedModelReplaced: true,
      });
    });

    it("keeps the stored model and reports unavailable when the catalog is empty", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });
      providersMock.mockResolvedValueOnce(createProvidersResponse({}));

      const { catalogAvailable } = await reconcileStoredModelSelection({
        forceCatalogRefresh: true,
      });

      expect(catalogAvailable).toBe(false);
      expect(setCurrentModelMock).not.toHaveBeenCalled();
      expect(getCurrentModelState()).toEqual({
        providerID: "openai",
        modelID: "gpt-4o",
        variant: "high",
      });
      expect(loggerWarnMock).toHaveBeenCalledWith(
        "[ModelManager] Skipping stored model validation: model catalog unavailable",
      );
    });

    it("reports unavailable when a failed refresh falls back to the stale catalog", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });
      await reconcileStoredModelSelection();
      providersMock.mockResolvedValueOnce({ data: null, error: new Error("upstream unavailable") });

      const { catalogAvailable } = await reconcileStoredModelSelection({
        forceCatalogRefresh: true,
      });

      expect(catalogAvailable).toBe(false);
      expect(setCurrentModelMock).not.toHaveBeenCalled();
    });
  });

  describe("warm-up after a server start", () => {
    const BUILT_IN_ONLY = {
      opencode: ["big-pickle"],
      openai: ["gpt-4o"],
    };
    const WITH_PLUGIN_PROVIDER = {
      ...BUILT_IN_ONLY,
      commandcode: ["deepseek-v4"],
    };

    it("lists nothing as missing outside the warm-up window", async () => {
      setCurrentModelState({ providerID: "commandcode", modelID: "deepseek-v4" });

      await expect(getMissingExpectedProviders(["openai"])).resolves.toEqual([]);
    });

    it("expects the selected model's provider", async () => {
      setCurrentModelState({ providerID: "commandcode", modelID: "deepseek-v4" });
      startModelCatalogWarmup();

      await expect(getMissingExpectedProviders(["openai"])).resolves.toEqual(["commandcode"]);
    });

    it("expects the config model's provider when no model is stored", async () => {
      startModelCatalogWarmup();

      await expect(getMissingExpectedProviders(["openai"])).resolves.toEqual(["opencode"]);
    });

    it("keeps a stored model whose provider is not listed yet and reads the catalog again", async () => {
      setCurrentModelState({ providerID: "commandcode", modelID: "deepseek-v4", variant: "high" });
      startModelCatalogWarmup();
      providersMock.mockResolvedValue(createProvidersResponse(BUILT_IN_ONLY));

      const result = await reconcileStoredModelSelection({ forceCatalogRefresh: true });

      expect(result).toEqual({
        catalogAvailable: true,
        catalogComplete: false,
        selectedModelListed: false,
        storedModelReplaced: false,
      });
      expect(setCurrentModelMock).not.toHaveBeenCalled();

      providersMock.mockResolvedValue(createProvidersResponse(WITH_PLUGIN_PROVIDER));
      const providers = await getProviders();

      expect(providersMock).toHaveBeenCalledTimes(2);
      expect(providers.map((provider) => provider.id)).toContain("commandcode");
      await expect(reconcileStoredModelSelection()).resolves.toMatchObject({
        catalogComplete: true,
        selectedModelListed: true,
      });
      // Inside the warm-up window even a complete list is read again.
      expect(providersMock).toHaveBeenCalledTimes(3);
    });

    it("does not cache a list lacking the selected model's provider, and the menu shows it once listed", async () => {
      setCurrentModelState({ providerID: "commandcode", modelID: "deepseek-v4", variant: "high" });
      startModelCatalogWarmup();
      providersMock.mockResolvedValueOnce(createProvidersResponse(BUILT_IN_ONLY));
      await reconcileStoredModelSelection({ forceCatalogRefresh: true });
      providersMock.mockResolvedValue(createProvidersResponse(WITH_PLUGIN_PROVIDER));

      const lists = await getModelSelectionLists();

      expect(lists.favorites).toContainEqual({
        providerID: "commandcode",
        modelID: "deepseek-v4",
      });
      expect(providersMock).toHaveBeenCalledTimes(2);
    });

    it("replaces a stored model that is still not listed once the window has closed", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      setCurrentModelState({ providerID: "commandcode", modelID: "deepseek-v4", variant: "high" });
      startModelCatalogWarmup();
      providersMock.mockResolvedValue(createProvidersResponse(BUILT_IN_ONLY));

      await reconcileStoredModelSelection({ forceCatalogRefresh: true });
      expect(setCurrentModelMock).not.toHaveBeenCalled();

      vi.setSystemTime(new Date("2026-01-01T00:01:01.000Z"));
      const result = await reconcileStoredModelSelection({ forceCatalogRefresh: true });

      expect(result.storedModelReplaced).toBe(true);
      expect(getCurrentModelState()).toEqual({
        providerID: "opencode",
        modelID: "big-pickle",
        variant: "default",
      });
    });
  });

  describe("waiting for providers after a location wakes", () => {
    const BUILT_IN_ONLY = {
      opencode: ["big-pickle"],
      openai: ["gpt-4o"],
    };
    const WITH_PLUGIN_PROVIDER = {
      ...BUILT_IN_ONLY,
      commandcode: ["deepseek-v4"],
    };

    function listedProviderIds(response: Awaited<ReturnType<typeof readProvidersWhenListed>>) {
      return (response.data?.providers ?? []).map((provider) => provider.id);
    }

    // Waiting for the expected providers reads the model catalog, which can wait on the server.
    async function untilProviderReads(count: number): Promise<void> {
      await vi.waitFor(() => expect(providersMock.mock.calls.length).toBeGreaterThanOrEqual(count));
    }

    beforeEach(() => {
      vi.useFakeTimers();
      setCurrentModelState({ providerID: "commandcode", modelID: "deepseek-v4" });
    });

    it("returns at once when every awaited provider is listed", async () => {
      providersMock.mockResolvedValue(createProvidersResponse(WITH_PLUGIN_PROVIDER));

      await readProvidersWhenListed();

      expect(providersMock).toHaveBeenCalledTimes(1);
    });

    it("reads again until the missing provider is listed", async () => {
      providersMock.mockResolvedValueOnce(createProvidersResponse(BUILT_IN_ONLY));
      providersMock.mockResolvedValue(createProvidersResponse(WITH_PLUGIN_PROVIDER));

      const read = readProvidersWhenListed("commandcode");
      await vi.advanceTimersByTimeAsync(500);

      expect(listedProviderIds(await read)).toContain("commandcode");
      expect(providersMock).toHaveBeenCalledTimes(2);
    });

    it("waits past a list with no models", async () => {
      providersMock.mockResolvedValueOnce(createProvidersResponse({}));
      providersMock.mockResolvedValueOnce(createProvidersResponse({ commandcode: [] }));
      providersMock.mockResolvedValue(createProvidersResponse(WITH_PLUGIN_PROVIDER));

      const read = readProvidersWhenListed("commandcode");
      await vi.advanceTimersByTimeAsync(1000);

      expect(listedProviderIds(await read)).toContain("commandcode");
      expect(providersMock).toHaveBeenCalledTimes(3);
    });

    it("waits for one provider without waiting for the stored model's provider", async () => {
      providersMock.mockResolvedValue(createProvidersResponse(BUILT_IN_ONLY));

      await readProvidersWhenListed("openai");

      expect(providersMock).toHaveBeenCalledTimes(1);
    });

    it("gives up after 10 s and does not wait for that provider again until it is listed", async () => {
      providersMock.mockResolvedValue(createProvidersResponse(BUILT_IN_ONLY));

      const read = readProvidersWhenListed();
      await untilProviderReads(1);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(listedProviderIds(await read)).not.toContain("commandcode");
      const callsAfterWait = providersMock.mock.calls.length;

      await readProvidersWhenListed();
      expect(providersMock).toHaveBeenCalledTimes(callsAfterWait + 1);

      providersMock.mockResolvedValueOnce(createProvidersResponse(WITH_PLUGIN_PROVIDER));
      await readProvidersWhenListed();
      const waitingAgain = readProvidersWhenListed();
      await untilProviderReads(callsAfterWait + 3);
      await vi.advanceTimersByTimeAsync(500);
      expect(providersMock).toHaveBeenCalledTimes(callsAfterWait + 4);
      await vi.advanceTimersByTimeAsync(10_000);
      await waitingAgain;
    });

    it("keeps a provider given up on while lists name it without models", async () => {
      providersMock.mockResolvedValue(createProvidersResponse(BUILT_IN_ONLY));
      const read = readProvidersWhenListed();
      await untilProviderReads(1);
      await vi.advanceTimersByTimeAsync(10_000);
      await read;

      providersMock.mockResolvedValue(
        createProvidersResponse({ ...BUILT_IN_ONLY, commandcode: [] }),
      );
      await reconcileStoredModelSelection({ forceCatalogRefresh: true });
      const callsBefore = providersMock.mock.calls.length;
      await readProvidersWhenListed("commandcode");

      expect(providersMock).toHaveBeenCalledTimes(callsBefore + 1);
    });

    it("waits again for a provider given up on once the server starts again", async () => {
      providersMock.mockResolvedValue(createProvidersResponse(BUILT_IN_ONLY));
      const read = readProvidersWhenListed();
      await untilProviderReads(1);
      await vi.advanceTimersByTimeAsync(10_000);
      await read;
      const callsAfterWait = providersMock.mock.calls.length;

      startModelCatalogWarmup();
      const waitingAgain = readProvidersWhenListed();
      await untilProviderReads(callsAfterWait + 1);
      await vi.advanceTimersByTimeAsync(500);

      expect(providersMock).toHaveBeenCalledTimes(callsAfterWait + 2);
      await vi.advanceTimersByTimeAsync(10_000);
      await waitingAgain;
    });

    it("returns a failed read at once", async () => {
      providersMock.mockResolvedValue({ data: null, error: new TypeError("fetch failed") });

      const response = await readProvidersWhenListed();

      expect(response.error).toBeInstanceOf(TypeError);
      expect(providersMock).toHaveBeenCalledTimes(1);
    });

    it("shares one wait between concurrent callers", async () => {
      providersMock.mockResolvedValueOnce(createProvidersResponse(BUILT_IN_ONLY));
      providersMock.mockResolvedValue(createProvidersResponse(WITH_PLUGIN_PROVIDER));

      const first = readProvidersWhenListed();
      const second = readProvidersWhenListed();
      await untilProviderReads(1);
      await vi.advanceTimersByTimeAsync(500);

      expect(await second).toBe(await first);
      expect(providersMock).toHaveBeenCalledTimes(2);
    });

    it("makes the model menu wait, but not the stored-model check", async () => {
      providersMock.mockResolvedValue(createProvidersResponse(BUILT_IN_ONLY));
      startModelCatalogWarmup();

      await reconcileStoredModelSelection({ forceCatalogRefresh: true });
      expect(providersMock).toHaveBeenCalledTimes(1);

      providersMock.mockResolvedValue(createProvidersResponse(WITH_PLUGIN_PROVIDER));
      providersMock.mockResolvedValueOnce(createProvidersResponse(BUILT_IN_ONLY));
      const providers = getProviders();
      await untilProviderReads(2);
      await vi.advanceTimersByTimeAsync(500);

      expect((await providers).map((provider) => provider.id)).toContain("commandcode");
      expect(providersMock).toHaveBeenCalledTimes(3);
    });

    it("does not hand a menu read the stored-model check's in-flight list", async () => {
      let resolveCheckRead: (value: unknown) => void = () => {};
      providersMock.mockImplementationOnce(
        () => new Promise((resolve) => (resolveCheckRead = resolve)),
      );
      providersMock.mockResolvedValue(createProvidersResponse(WITH_PLUGIN_PROVIDER));
      startModelCatalogWarmup();

      const check = reconcileStoredModelSelection({ forceCatalogRefresh: true });
      const menu = getProviders();
      resolveCheckRead(createProvidersResponse(BUILT_IN_ONLY));
      await check;

      expect((await menu).map((provider) => provider.id)).toContain("commandcode");
      expect(providersMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("empty model catalog", () => {
    it("is not cached: the next read asks the server again", async () => {
      providersMock.mockResolvedValueOnce(createProvidersResponse({}));

      await expect(reconcileStoredModelSelection()).resolves.toMatchObject({
        catalogAvailable: false,
      });
      const providers = await getProviders();

      expect(providersMock).toHaveBeenCalledTimes(2);
      expect(providers.map((provider) => provider.id)).toEqual([
        "anthropic",
        "google",
        "openai",
        "opencode",
      ]);
    });

    it("treats providers without models as an empty catalog", async () => {
      providersMock.mockResolvedValueOnce(createProvidersResponse({ openai: [] }));

      await expect(reconcileStoredModelSelection()).resolves.toMatchObject({
        catalogAvailable: false,
      });
      await expect(searchModels("gpt")).resolves.not.toHaveLength(0);
      expect(providersMock).toHaveBeenCalledTimes(2);
    });

    it("drops a previously cached catalog", async () => {
      await getProviders();
      providersMock.mockResolvedValueOnce(createProvidersResponse({}));

      await reconcileStoredModelSelection({ forceCatalogRefresh: true });

      providersMock.mockResolvedValueOnce(createProvidersResponse({}));
      await expect(reconcileStoredModelSelection()).resolves.toMatchObject({
        catalogAvailable: false,
      });
      expect(providersMock).toHaveBeenCalledTimes(3);
    });
  });

  describe("searchModels", () => {
    it("returns matching models by case-insensitive substring", async () => {
      const results = await searchModels("gpt");

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results).toContainEqual({ providerID: "openai", modelID: "gpt-4o" });
      expect(results).toContainEqual({ providerID: "openai", modelID: "gpt-3.5" });
    });

    it("matches across providerID and modelID", async () => {
      const results = await searchModels("openai");

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results).toContainEqual({ providerID: "openai", modelID: "gpt-3.5" });
      expect(results).toContainEqual({ providerID: "openai", modelID: "gpt-4o" });
    });

    it("matches by providerID substring", async () => {
      const results = await searchModels("anthrop");

      expect(results).toContainEqual({ providerID: "anthropic", modelID: "claude-sonnet" });
    });

    it("is case-insensitive", async () => {
      const results = await searchModels("GPT-4O");

      expect(results).toContainEqual({ providerID: "openai", modelID: "gpt-4o" });
    });

    it("returns empty array when no models match", async () => {
      const results = await searchModels("nonexistent-model-xyz");

      expect(results).toHaveLength(0);
    });

    it("returns empty array for empty query", async () => {
      const results = await searchModels("   ");

      expect(results).toHaveLength(0);
    });

    it("sorts results alphabetically", async () => {
      const results = await searchModels("gpt");

      const keys = results.map((m) => `${m.providerID}/${m.modelID}`);
      expect(keys).toEqual([...keys].sort());
    });

    it("returns empty array when catalog fetch fails", async () => {
      __resetModelCatalogCacheForTests();
      providersMock.mockResolvedValueOnce({ data: null, error: new Error("fetch failed") });

      const results = await searchModels("gpt");

      expect(results).toHaveLength(0);
    });

    it("uses model catalog cache between repeated calls", async () => {
      __resetModelCatalogCacheForTests();
      providersMock.mockClear();

      await searchModels("gpt");
      await searchModels("claude");

      expect(providersMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("getProviders", () => {
    it("returns providers with model counts sorted by name", async () => {
      const providers = await getProviders();

      expect(providers).toEqual([
        { id: "anthropic", name: "anthropic", modelCount: 1 },
        { id: "google", name: "google", modelCount: 1 },
        { id: "openai", name: "openai", modelCount: 2 },
        { id: "opencode", name: "opencode", modelCount: 1 },
      ]);
    });

    it("uses the provider display name when available", async () => {
      __resetModelCatalogCacheForTests();
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o" });
      providersMock.mockResolvedValueOnce({
        data: {
          providers: [
            { id: "openai", name: "OpenAI", models: { "gpt-4o": { id: "gpt-4o" } } },
            { id: "zai", models: { "glm-5": { id: "glm-5" } } },
          ],
        },
        error: null,
      });

      const providers = await getProviders();

      expect(providers).toEqual([
        { id: "openai", name: "OpenAI", modelCount: 1 },
        { id: "zai", name: "zai", modelCount: 1 },
      ]);
    });

    it("leaves out a provider with no models left", async () => {
      __resetModelCatalogCacheForTests();
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o" });
      providersMock.mockResolvedValueOnce({
        data: {
          providers: [
            { id: "openai", name: "OpenAI", models: { "gpt-4o": { id: "gpt-4o" } } },
            { id: "anthropic", name: "Anthropic", models: {} },
          ],
        },
        error: null,
      });

      const providers = await getProviders();

      expect(providers.map((provider) => provider.id)).toEqual(["openai"]);
    });

    it("returns empty array when catalog fetch fails", async () => {
      __resetModelCatalogCacheForTests();
      providersMock.mockResolvedValueOnce({ data: null, error: new Error("fetch failed") });

      await expect(getProviders()).resolves.toEqual([]);
    });

    it("uses model catalog cache between repeated calls", async () => {
      __resetModelCatalogCacheForTests();
      providersMock.mockClear();

      await getProviders();
      await getProviders();

      expect(providersMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("getProviderModels", () => {
    it("returns provider models sorted by model ID", async () => {
      const models = await getProviderModels("openai");

      expect(models).toEqual([
        { providerID: "openai", modelID: "gpt-3.5" },
        { providerID: "openai", modelID: "gpt-4o" },
      ]);
    });

    it("returns empty array for an unknown provider", async () => {
      await expect(getProviderModels("unknown")).resolves.toEqual([]);
    });

    it("returns empty array when catalog fetch fails", async () => {
      __resetModelCatalogCacheForTests();
      providersMock.mockResolvedValueOnce({ data: null, error: new Error("fetch failed") });

      await expect(getProviderModels("openai")).resolves.toEqual([]);
    });
  });

  describe("models Reasonix no longer offers", () => {
    const WITHOUT_OPENAI = {
      opencode: ["big-pickle"],
      google: ["gemini-pro"],
    };

    // A read lacking an awaited provider waits 10 s for it before giving up.
    async function afterProviderWait<T>(promise: Promise<T>, readsBefore: number): Promise<T> {
      await vi.waitFor(() => expect(providersMock.mock.calls.length).toBeGreaterThan(readsBefore));
      await vi.advanceTimersByTimeAsync(10_000);
      return promise;
    }

    it("does not serve a catalog cached before the warm-up window opened", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });
      await getModelSelectionLists();
      providersMock.mockResolvedValue(createProvidersResponse(WITHOUT_OPENAI));
      vi.useFakeTimers();

      startModelCatalogWarmup();
      const lists = await afterProviderWait(getModelSelectionLists(), 1);

      expect(lists.favorites).not.toContainEqual({ providerID: "openai", modelID: "gpt-4o" });
    });

    it("reads the catalog again on every menu read inside the warm-up window", async () => {
      startModelCatalogWarmup();

      await getProviders();
      await getProviders();

      expect(providersMock).toHaveBeenCalledTimes(2);
    });

    it("hides the config model when Reasonix does not offer it", async () => {
      providersMock.mockResolvedValue(createProvidersResponse({ google: ["gemini-pro"] }));
      vi.useFakeTimers();

      const lists = await afterProviderWait(getModelSelectionLists(), 0);

      expect(lists.favorites).toEqual([]);
    });

    it("shows the config model when the catalog cannot be read", async () => {
      providersMock.mockResolvedValue({ data: null, error: new Error("fetch failed") });

      const lists = await getModelSelectionLists();

      expect(lists.favorites).toEqual([{ providerID: "opencode", modelID: "big-pickle" }]);
    });

    it("keeps the stored model when the config model is not offered either", async () => {
      setCurrentModelState({ providerID: "openai", modelID: "gpt-4o", variant: "high" });
      providersMock.mockResolvedValue(createProvidersResponse({ google: ["gemini-pro"] }));

      const result = await reconcileStoredModelSelection({ forceCatalogRefresh: true });

      expect(result.storedModelReplaced).toBe(false);
      expect(setCurrentModelMock).not.toHaveBeenCalled();
      expect(getCurrentModelState()).toEqual({
        providerID: "openai",
        modelID: "gpt-4o",
        variant: "high",
      });
    });

    describe("getModelAvailability", () => {
      it("reports a listed model as offered", async () => {
        await expect(getModelAvailability("openai", "gpt-4o")).resolves.toBe("offered");
      });

      it("reports a model its listed provider no longer has", async () => {
        await expect(getModelAvailability("openai", "retired")).resolves.toBe("model-missing");
      });

      it("reports a provider still not listed after the wait", async () => {
        vi.useFakeTimers();
        providersMock.mockResolvedValue(createProvidersResponse(WITHOUT_OPENAI));

        const availability = getModelAvailability("openai", "gpt-4o");
        await vi.advanceTimersByTimeAsync(10_000);

        await expect(availability).resolves.toBe("provider-missing");
      });

      it("reports unknown when the list cannot be read", async () => {
        providersMock.mockResolvedValue({ data: null, error: new Error("fetch failed") });

        await expect(getModelAvailability("openai", "gpt-4o")).resolves.toBe("unknown");
      });

      it("reports unknown when the server lists no models", async () => {
        providersMock.mockResolvedValue(createProvidersResponse({ openai: [] }));
        vi.useFakeTimers();

        await expect(afterProviderWait(getModelAvailability("openai", "gpt-4o"), 0)).resolves.toBe(
          "unknown",
        );
      });

      it("drops the cached catalog when a model is missing", async () => {
        await getProviders();
        expect(providersMock).toHaveBeenCalledTimes(1);

        await getModelAvailability("openai", "retired");
        await getProviders();

        expect(providersMock).toHaveBeenCalledTimes(3);
      });
    });

    describe("resolveModelToAdopt", () => {
      it("adopts a model Reasonix offers", async () => {
        await expect(
          resolveModelToAdopt({ providerID: "openai", modelID: "gpt-4o" }),
        ).resolves.toEqual({ providerID: "openai", modelID: "gpt-4o" });
      });

      it("adopts the config model instead of one its provider no longer lists", async () => {
        await expect(
          resolveModelToAdopt({ providerID: "openai", modelID: "retired" }),
        ).resolves.toEqual({ providerID: "opencode", modelID: "big-pickle" });
      });

      it("adopts the config model instead of one whose provider is gone", async () => {
        vi.useFakeTimers();
        providersMock.mockResolvedValue(createProvidersResponse(WITHOUT_OPENAI));

        const adopted = resolveModelToAdopt({ providerID: "openai", modelID: "gpt-4o" });
        await vi.advanceTimersByTimeAsync(10_000);

        await expect(adopted).resolves.toEqual({ providerID: "opencode", modelID: "big-pickle" });
      });

      it("adopts a model whose provider is not listed yet inside the warm-up window", async () => {
        vi.useFakeTimers();
        startModelCatalogWarmup();
        providersMock.mockResolvedValue(createProvidersResponse(WITHOUT_OPENAI));

        const adopted = resolveModelToAdopt({ providerID: "openai", modelID: "gpt-4o" });
        await vi.advanceTimersByTimeAsync(10_000);

        await expect(adopted).resolves.toEqual({ providerID: "openai", modelID: "gpt-4o" });
      });

      it("adopts nothing when the config model is not offered either", async () => {
        providersMock.mockResolvedValue(createProvidersResponse({ openai: ["gpt-4o"] }));
        vi.useFakeTimers();

        await expect(
          afterProviderWait(resolveModelToAdopt({ providerID: "openai", modelID: "retired" }), 1),
        ).resolves.toBeNull();
      });

      it("adopts the model when the list cannot be read", async () => {
        providersMock.mockResolvedValue({ data: null, error: new Error("fetch failed") });

        await expect(
          resolveModelToAdopt({ providerID: "openai", modelID: "gpt-4o" }),
        ).resolves.toEqual({ providerID: "openai", modelID: "gpt-4o" });
      });
    });
  });
});

describe("app/services/model-selection-service applyModelToReasonix", () => {
  beforeEach(() => {
    promptAsyncMock.mockReset();
    getCurrentSessionMock.mockReset();
    loggerInfoMock.mockReset();
    loggerWarnMock.mockReset();
  });

  it("asks Reasonix to switch the current session to the selected model", async () => {
    getCurrentSessionMock.mockReturnValue({
      id: "session-1",
      title: "Session",
      directory: "/repo",
    });
    promptAsyncMock.mockResolvedValue({ data: { inboxID: "session-1" }, error: undefined });

    await applyModelToReasonix({
      providerID: "deepseek",
      modelID: "deepseek-v4-pro",
      variant: "default",
    });

    expect(promptAsyncMock).toHaveBeenCalledWith({
      sessionID: "session-1",
      directory: "/repo",
      parts: [{ type: "text", text: "/model deepseek/deepseek-v4-pro" }],
    });
  });

  it("does nothing when no session exists yet", async () => {
    getCurrentSessionMock.mockReturnValue(null);

    await applyModelToReasonix({
      providerID: "deepseek",
      modelID: "deepseek-v4-pro",
      variant: "default",
    });

    expect(promptAsyncMock).not.toHaveBeenCalled();
  });

  it("does nothing when the model is empty", async () => {
    getCurrentSessionMock.mockReturnValue({ id: "session-1", directory: "/repo", title: "t" });

    await applyModelToReasonix({ providerID: "", modelID: "", variant: "default" });

    expect(promptAsyncMock).not.toHaveBeenCalled();
  });

  it("logs but does not throw when Reasonix rejects the command", async () => {
    getCurrentSessionMock.mockReturnValue({ id: "session-1", directory: "/repo", title: "t" });
    promptAsyncMock.mockResolvedValue({ data: undefined, error: new Error("busy") });

    await expect(
      applyModelToReasonix({
        providerID: "deepseek",
        modelID: "deepseek-v4-pro",
        variant: "default",
      }),
    ).resolves.toBeUndefined();

    expect(loggerWarnMock).toHaveBeenCalled();
  });
});