import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// tests/setup.ts mocks the instance module globally so the rest of the suite never
// spawns a real process; these tests exercise the real spawn handling.
vi.unmock("../../src/reasonix/instance.js");

import { config } from "../../src/config.js";
import { getInstance, stopAllInstances } from "../../src/reasonix/instance.js";

const originalBinary = config.reasonix.serveBinary;
let tempPaths: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "reasonix-instance-test-"));
  tempPaths.push(dir);
  return dir;
}

describe("getInstance", () => {
  beforeEach(() => {
    config.reasonix.serveBinary = originalBinary;
  });

  afterEach(async () => {
    config.reasonix.serveBinary = originalBinary;
    await stopAllInstances();
    for (const target of tempPaths) {
      rmSync(target, { recursive: true, force: true });
    }
    tempPaths = [];
  });

  it("rejects a root that does not exist without surfacing an uncaught error", async () => {
    const missing = join(tempDir(), "gone");

    await expect(getInstance(missing)).rejects.toThrow(/does not exist/);
  });

  it("rejects a root that is a file, not a directory", async () => {
    const file = join(tempDir(), "not-a-dir");
    writeFileSync(file, "");

    await expect(getInstance(file)).rejects.toThrow(/does not exist/);
  });

  it("rejects instead of crashing when the serve binary cannot be spawned", async () => {
    config.reasonix.serveBinary = join(tempDir(), "no-such-binary");

    await expect(getInstance(tempDir())).rejects.toThrow();
  });
});