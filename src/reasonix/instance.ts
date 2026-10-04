import { spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { getRuntimePaths } from "../runtime/paths.js";

/** One `reasonix serve` process serving one project root. */
export interface ReasonixInstance {
  root: string;
  baseUrl: string;
  token: string;
  port: number;
  process: ChildProcess | null;
}

interface StoredInstance {
  port: number;
  token: string;
}

type StoredInstances = Record<string, StoredInstance>;

const BASE_PORT = 47610;
const PORT_RANGE = 200;
const READY_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 250;
const STOP_GRACE_MS = 3_000;

const instances = new Map<string, ReasonixInstance>();
const starting = new Map<string, Promise<ReasonixInstance>>();

function getStateFilePath(): string {
  return path.join(getRuntimePaths().runDirPath, "reasonix-instances.json");
}

/**
 * Ports and tokens are persisted so a restart reconnects to the same instances
 * instead of leaking new processes on new ports.
 */
function readState(): StoredInstances {
  try {
    const raw = fs.readFileSync(getStateFilePath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as StoredInstances) : {};
  } catch {
    return {};
  }
}

function writeState(state: StoredInstances): void {
  const filePath = getStateFilePath();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  } catch (error) {
    logger.warn("[ReasonixInstance] Could not persist instance state:", error);
  }
}

/** A stable port per root, so a root always gets the same one. */
function portForRoot(root: string): number {
  const digest = createHash("sha256").update(root).digest();
  const offset = digest.readUInt16BE(0) % PORT_RANGE;
  return BASE_PORT + offset;
}

function isListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (listening: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(listening);
    };
    socket.setTimeout(1_000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, "127.0.0.1");
  });
}

async function waitForReady(instance: ReasonixInstance): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (instance.process?.exitCode !== null && instance.process?.exitCode !== undefined) {
      throw new Error(`reasonix serve exited with code ${instance.process.exitCode}`);
    }
    if (await isListening(instance.port)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
  }
  throw new Error(`reasonix serve did not become ready on port ${instance.port}`);
}

function spawnServe(root: string, port: number, token: string): ChildProcess {
  const child = spawn(
    config.reasonix.serveBinary,
    ["serve", "--addr", `127.0.0.1:${port}`, "--auth", "token", "--token", token],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: process.env },
  );

  child.stdout?.on("data", (chunk: Buffer) => {
    logger.debug(`[ReasonixInstance] serve(${root}): ${chunk.toString().trimEnd()}`);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    logger.debug(`[ReasonixInstance] serve(${root}) stderr: ${chunk.toString().trimEnd()}`);
  });
  child.on("exit", (code, signal) => {
    logger.info(`[ReasonixInstance] serve(${root}) exited: code=${code} signal=${signal}`);
    const current = instances.get(root);
    if (current && current.process === child) {
      current.process = null;
      instances.delete(root);
    }
  });

  return child;
}

async function startInstance(root: string): Promise<ReasonixInstance> {
  const state = readState();
  const stored = state[root];
  const port = stored?.port ?? portForRoot(root);
  const token = stored?.token ?? randomBytes(32).toString("hex");

  if (await isListening(port)) {
    // A serve process from an earlier run is still up; reuse it.
    logger.info(`[ReasonixInstance] Reusing serve already listening on ${port} for ${root}`);
    const reused: ReasonixInstance = {
      root,
      port,
      token,
      baseUrl: `http://127.0.0.1:${port}`,
      process: null,
    };
    instances.set(root, reused);
    return reused;
  }

  logger.info(`[ReasonixInstance] Starting reasonix serve for ${root} on 127.0.0.1:${port}`);
  const instance: ReasonixInstance = {
    root,
    port,
    token,
    baseUrl: `http://127.0.0.1:${port}`,
    process: spawnServe(root, port, token),
  };

  state[root] = { port, token };
  writeState(state);

  try {
    await waitForReady(instance);
  } catch (error) {
    instance.process?.kill("SIGKILL");
    throw error;
  }

  instances.set(root, instance);
  return instance;
}

/** The serve instance for a project root, started on first use. */
export function getInstance(root: string): Promise<ReasonixInstance> {
  const existing = instances.get(root);
  if (existing) {
    return Promise.resolve(existing);
  }

  const pending = starting.get(root);
  if (pending) {
    return pending;
  }

  const start = startInstance(root).finally(() => starting.delete(root));
  starting.set(root, start);
  return start;
}

export function getRunningInstances(): ReasonixInstance[] {
  return [...instances.values()];
}

/**
 * Stops the serve instances and lets them start again on next use, which is how
 * Reasonix takes up a changed configuration: it reads its environment when the
 * process starts and offers no way to reload it in place.
 */
export async function restartAllInstances(): Promise<number> {
  const all = [...instances.values()];
  if (all.length === 0) {
    logger.info("[ReasonixInstance] No serve instance was running; nothing to restart");
    return 0;
  }
  instances.clear();
  await Promise.all(all.map(stopInstance));
  logger.info(`[ReasonixInstance] Restarted ${all.length} serve instance(s) on next use`);
  return all.length;
}

async function stopInstance(instance: ReasonixInstance): Promise<void> {
  const child = instance.process;
  if (!child || child.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, STOP_GRACE_MS);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

/** Stops every serve process this bot started, for shutdown and `/stop`. */
export async function stopAllInstances(): Promise<void> {
  const all = [...instances.values()];
  instances.clear();
  await Promise.all(all.map(stopInstance));
  logger.info(`[ReasonixInstance] Stopped ${all.length} serve instance(s)`);
}
