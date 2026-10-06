import { beforeEach, afterEach, vi } from "vitest";
import { ensureTestEnvironment } from "./helpers/test-environment.js";
import { resetSingletonState } from "./helpers/reset-singleton-state.js";

/**
 * Tests never spawn a real `reasonix serve`. The default instance answers with one
 * ready server, so code that resolves an instance keeps working; the tests that cover
 * process management mock this module themselves.
 */
vi.mock("../src/reasonix/instance.js", () => ({
  getInstance: vi.fn(async (root: string) => ({
    root,
    port: 47610,
    baseUrl: "http://127.0.0.1:47610",
    token: "test-token",
  })),
  getRunningInstances: vi.fn(() => []),
  restartAllInstances: vi.fn(async () => 0),
  stopAllInstances: vi.fn(async () => undefined),
  configuredRoots: vi.fn(() => ["/repo"]),
  reasonixHome: vi.fn(() => "/tmp/reasonix-test"),
}));

ensureTestEnvironment();

beforeEach(() => {
  ensureTestEnvironment();
  return resetSingletonState();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  ensureTestEnvironment();
  return resetSingletonState();
});