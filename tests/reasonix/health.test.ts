import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  healthMock: vi.fn(),
  configuredRoots: vi.fn(() => ["/home/user/project"]),
  loggerWarnMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock("../../src/reasonix/client.js", () => ({
  reasonixClient: { global: { health: mocked.healthMock } },
}));

vi.mock("../../src/reasonix/instance.js", () => ({
  configuredRoots: mocked.configuredRoots,
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: mocked.loggerWarnMock,
    error: mocked.loggerErrorMock,
  },
}));

import {
  __resetServerHealthStateForTests,
  checkReasonixHealth,
  classifyFailedHealthCheck,
  describeServerUrl,
  explainFailedHealthCheck,
  reportServerProblem,
} from "../../src/reasonix/health.js";

describe("reasonix/health", () => {
  beforeEach(() => {
    __resetServerHealthStateForTests();
    mocked.healthMock.mockReset();
    mocked.configuredRoots.mockReset().mockReturnValue(["/home/user/project"]);
    mocked.loggerWarnMock.mockReset();
    mocked.loggerErrorMock.mockReset();
  });

  it("names the configured folders", () => {
    expect(describeServerUrl()).toBe("/home/user/project");

    mocked.configuredRoots.mockReturnValue([]);
    expect(describeServerUrl()).toBe("no configured folder");
  });

  it("reports a server that answers as healthy with the Reasonix version", async () => {
    mocked.healthMock.mockResolvedValue({ data: { healthy: true, version: "1.39.7" } });

    await expect(checkReasonixHealth()).resolves.toEqual({ healthy: true, version: "1.39.7" });
    expect(mocked.loggerWarnMock).not.toHaveBeenCalled();
  });

  it("reports a 401 as an authentication problem naming the folders", async () => {
    mocked.healthMock.mockResolvedValue({ error: { status: 401 } });

    const health = await checkReasonixHealth();

    expect(health.healthy).toBe(false);
    expect(mocked.loggerWarnMock).toHaveBeenCalledWith(expect.stringContaining("Authentication failed"));
    expect(mocked.loggerWarnMock).toHaveBeenCalledWith(expect.stringContaining("/home/user/project"));
  });

  it("logs an authentication problem only once until the server is healthy again", async () => {
    mocked.healthMock.mockResolvedValue({ error: { status: 401 } });

    await checkReasonixHealth();
    await checkReasonixHealth();
    expect(mocked.loggerWarnMock).toHaveBeenCalledTimes(1);

    mocked.healthMock.mockResolvedValue({ data: { healthy: true, version: "1.39.7" } });
    await checkReasonixHealth();
    mocked.healthMock.mockResolvedValue({ error: { status: 401 } });
    await checkReasonixHealth();
    expect(mocked.loggerWarnMock).toHaveBeenCalledTimes(2);
  });

  it("reports a response that is not a Reasonix server as unhealthy without an auth warning", async () => {
    mocked.healthMock.mockResolvedValue({ data: undefined, error: new Error("Unexpected status") });

    const health = await checkReasonixHealth();

    expect(health.healthy).toBe(false);
    expect(mocked.loggerWarnMock).not.toHaveBeenCalled();
  });

  it("surfaces a refused connection as unhealthy without explaining it", async () => {
    mocked.healthMock.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:47610"));

    const health = await checkReasonixHealth();

    expect(health.healthy).toBe(false);
    expect((health as { error: Error }).error.message).toContain("ECONNREFUSED");
    expect(mocked.loggerWarnMock).not.toHaveBeenCalled();
  });

  it("explains an unexpected transport error once", async () => {
    mocked.healthMock.mockRejectedValue(new Error("something else broke"));

    await checkReasonixHealth();
    await checkReasonixHealth();

    expect(mocked.loggerWarnMock).not.toHaveBeenCalled();
    expect(mocked.loggerErrorMock).not.toHaveBeenCalled();
  });

  it("classifies a failed health check without logging", async () => {
    mocked.healthMock.mockResolvedValue({ error: { status: 401 } });

    await expect(classifyFailedHealthCheck()).resolves.toEqual({ kind: "unauthorized" });
    expect(mocked.loggerWarnMock).not.toHaveBeenCalled();

    mocked.healthMock.mockResolvedValue({ error: new Error("boom") });
    await expect(classifyFailedHealthCheck()).resolves.toEqual({ kind: "unknown" });
  });

  it("explains a failure every time in always mode and once in once mode", async () => {
    mocked.healthMock.mockResolvedValue({ error: { status: 401 } });

    await explainFailedHealthCheck("once");
    await explainFailedHealthCheck("once");
    expect(mocked.loggerWarnMock).toHaveBeenCalledTimes(1);

    await explainFailedHealthCheck("always");
    await explainFailedHealthCheck("always");
    expect(mocked.loggerWarnMock).toHaveBeenCalledTimes(3);
  });

  it("reports a problem under its own key in once mode", () => {
    const report = vi.fn();

    reportServerProblem("a", "once", report);
    reportServerProblem("a", "once", report);
    expect(report).toHaveBeenCalledTimes(1);

    reportServerProblem("b", "once", report);
    expect(report).toHaveBeenCalledTimes(2);

    reportServerProblem("b", "always", report);
    reportServerProblem("b", "always", report);
    expect(report).toHaveBeenCalledTimes(4);
  });
});