import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkFolderPresence,
  collectFromPresentFolders,
  findMissingFolders,
} from "../../../src/app/services/folder-presence-service.js";

vi.mock("../../../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

let root: string;

/** A real folder under a temp root, so the check is not a mock of itself. */
function folder(name: string): string {
  return path.join(root, name);
}

describe("app/services/folder-presence-service", () => {
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "folder-presence-"));
    await fs.mkdir(folder("present"));
    await fs.mkdir(folder("nested/deep"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  describe("checkFolderPresence", () => {
    it("finds a folder that exists", async () => {
      expect(await checkFolderPresence(folder("present"))).toBe("present");
    });

    it("finds a folder several levels down", async () => {
      expect(await checkFolderPresence(folder("nested/deep"))).toBe("present");
    });

    it("reports a folder that was removed as missing", async () => {
      const gone = folder("gone");
      await fs.mkdir(gone);
      await fs.rm(gone, { recursive: true });

      expect(await checkFolderPresence(gone)).toBe("missing");
    });

    it("reports a path under a file as missing", async () => {
      await fs.writeFile(folder("a-file"), "not a folder");

      expect(await checkFolderPresence(path.join(folder("a-file"), "under"))).toBe("missing");
    });

    it("follows a symlink into a folder that exists", async () => {
      const link = folder("link");
      await fs.symlink(folder("present"), link);

      expect(await checkFolderPresence(link)).toBe("present");
    });

    it("reports a symlink whose target is gone as missing", async () => {
      const target = folder("target");
      await fs.mkdir(target);
      const link = folder("dangling");
      await fs.symlink(target, link);
      await fs.rm(target, { recursive: true });

      expect(await checkFolderPresence(link)).toBe("missing");
    });

    it("stays unknown for a file, since a project folder is not one", async () => {
      await fs.writeFile(folder("a-file"), "not a folder");

      expect(await checkFolderPresence(folder("a-file"))).toBe("unknown");
    });

    it("never reports the global project as missing", async () => {
      expect(await checkFolderPresence("/")).toBe("present");
    });
  });

  describe("findMissingFolders", () => {
    it("asks about each folder once and returns the gone ones", async () => {
      const found = await findMissingFolders([
        folder("present"),
        folder("gone"),
        folder("present"),
      ]);

      expect([...found]).toEqual([folder("gone")]);
    });

    it("reports nothing missing when every folder is there", async () => {
      const found = await findMissingFolders([folder("present"), folder("nested/deep")]);

      expect(found.size).toBe(0);
    });
  });

  describe("collectFromPresentFolders", () => {
    it("drops items whose folder is gone", async () => {
      const fetchItems = vi.fn(async () => [folder("gone"), folder("present")]);

      expect(await collectFromPresentFolders(fetchItems, (item) => item, 2)).toEqual([
        folder("present"),
      ]);
      // One more read, since the first page held too few usable items, and then
      // the source answered with fewer than it was asked for.
      expect(fetchItems).toHaveBeenCalledTimes(2);
    });

    it("asks for more when too many items were in folders that are gone", async () => {
      const pages = [
        [folder("gone"), folder("gone-2")],
        [folder("gone"), folder("present")],
      ];
      const fetchItems = vi.fn(async () => pages[fetchItems.mock.calls.length - 1] ?? []);

      expect(await collectFromPresentFolders(fetchItems, (item) => item, 2)).toEqual([
        folder("present"),
      ]);
      expect(fetchItems).toHaveBeenCalledTimes(2);
    });

    it("returns what the source had once asking more cannot help", async () => {
      const fetchItems = vi.fn(async () => [folder("present")]);

      expect(await collectFromPresentFolders(fetchItems, (item) => item, 5)).toEqual([
        folder("present"),
      ]);
    });
  });
});
