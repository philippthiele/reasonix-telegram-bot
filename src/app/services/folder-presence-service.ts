import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../../utils/logger.js";

/**
 * Whether a folder still exists. "unknown" covers every answer that is not a
 * confirmed absence, and callers treat it as "present".
 */
export type FolderPresence = "present" | "missing" | "unknown";

/** The global project of non-git folders; it is never a folder that can vanish. */
const GLOBAL_PROJECT_FOLDER = "/";

/**
 * The bot and Reasonix run on the same machine, so the bot can look at a folder
 * itself instead of asking a server that may only be able to answer for the
 * workspace it was started in.
 */
export async function checkFolderPresence(folder: string): Promise<FolderPresence> {
  if (folder === GLOBAL_PROJECT_FOLDER) {
    return "present";
  }

  try {
    // `stat` follows a symlink, so a link into a folder that is gone counts as gone.
    const stats = await fs.stat(folder);
    return stats.isDirectory() ? "present" : "unknown";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      logger.info(`[FolderPresence] Folder no longer exists: ${folder}`);
      return "missing";
    }
    logger.debug(`[FolderPresence] Could not tell whether ${folder} exists:`, error);
    return "unknown";
  }
}

/** The folders among these that are confirmed gone; each is asked about once. */
export async function findMissingFolders(folders: Iterable<string>): Promise<Set<string>> {
  const unique = [...new Set(folders)];
  const presences = await Promise.all(unique.map((folder) => checkFolderPresence(folder)));
  return new Set(unique.filter((_, index) => presences[index] === "missing"));
}

/**
 * Reads a list newest-first, leaving out items whose folder is gone, and asks the source for
 * more until at least `wanted` items remain or the source has no more. Returns every
 * remaining item read, in source order.
 */
export async function collectFromPresentFolders<T>(
  fetchItems: (limit: number) => Promise<T[]>,
  folderOf: (item: T) => string,
  wanted: number,
): Promise<T[]> {
  const missingByFolder = new Map<string, boolean>();
  let limit = Math.max(1, wanted);
  for (;;) {
    const items = await fetchItems(limit);
    const unchecked = [...new Set(items.map(folderOf))].filter(
      (folder) => !missingByFolder.has(folder),
    );
    const missing = await findMissingFolders(unchecked);
    for (const folder of unchecked) {
      missingByFolder.set(folder, missing.has(folder));
    }
    const visible = items.filter((item) => !missingByFolder.get(folderOf(item)));
    if (visible.length >= wanted || items.length < limit) {
      return visible;
    }
    limit *= 2;
  }
}

/** The folder's own name, which is what a person recognises in a list. */
export function folderName(folder: string): string {
  const name = path.basename(folder.replace(/[\\/]+$/, ""));
  return name.length > 0 ? name : folder;
}
