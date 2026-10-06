import os from "node:os";
import path from "node:path";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setRuntimeMode } from "../../../src/runtime/mode.js";
import type { ScheduledTask } from "../../../src/app/types/scheduled-task.js";
import {
  __resetSettingsForTests,
  flushSettings,
  getCompactOutputMode,
  getPromptQueueMode,
  getResponseStreamingMode,
  getSendDiffFileAttachments,
  getPinnedDashboardEnabled,
  getShowAssistantRunFooter,
  getShowThinkingContent,
  getScheduledTasks,
  getTtsMode,
  loadSettings,
  setCompactOutputMode,
  setPromptQueueMode,
  setScheduledTasks,
  setResponseStreamingMode,
  setSendDiffFileAttachments,
  setShowAssistantRunFooter,
  setShowThinkingContent,
} from "../../../src/app/stores/settings-store.js";

describe("app/stores/settings-store", () => {
  let tempHome: string;

  beforeEach(async () => {
    delete process.env.INITIAL_SETTINGS_PRESET;
    tempHome = await mkdtemp(path.join(os.tmpdir(), "reasonix-telegram-settings-store-"));
    process.env.REASONIX_TELEGRAM_HOME = tempHome;
    setRuntimeMode("installed");
    __resetSettingsForTests();
  });

  afterEach(async () => {
    delete process.env.REASONIX_TELEGRAM_HOME;
    __resetSettingsForTests();
    await rm(tempHome, { recursive: true, force: true });
  });

  it.each([
    { oldValue: true, expectedMode: "all" },
    { oldValue: false, expectedMode: "off" },
  ] as const)(
    "migrates ttsEnabled=$oldValue to $expectedMode mode",
    async ({ oldValue, expectedMode }) => {
      await writeFile(
        path.join(tempHome, "settings.json"),
        JSON.stringify({ ttsEnabled: oldValue }, null, 2),
      );

      await loadSettings();

      expect(getTtsMode()).toBe(expectedMode);
    },
  );

  it("uses disabled compact output mode by default", async () => {
    await loadSettings();

    expect(getCompactOutputMode()).toBe(false);
  });

  it("loads compact output mode from settings.json", async () => {
    await writeFile(path.join(tempHome, "settings.json"), JSON.stringify({ compactOutputMode: true }));

    await loadSettings();

    expect(getCompactOutputMode()).toBe(true);
  });

  it("shows thinking content by default", async () => {
    await loadSettings();

    expect(getShowThinkingContent()).toBe(true);
  });

  it("shows assistant run footer by default", async () => {
    await loadSettings();

    expect(getShowAssistantRunFooter()).toBe(true);
  });

  it("enables the pinned session dashboard by default", async () => {
    await loadSettings();

    expect(getPinnedDashboardEnabled()).toBe(true);
  });

  it("sends diff file attachments by default", async () => {
    await loadSettings();

    expect(getSendDiffFileAttachments()).toBe(true);
  });

  it("persists the diff file attachment setting", async () => {
    await loadSettings();

    setSendDiffFileAttachments(false);
    await flushSettings();

    expect(getSendDiffFileAttachments()).toBe(false);
    await loadSettings();
    expect(getSendDiffFileAttachments()).toBe(false);
  });

  it("loads the pinned session dashboard setting from settings.json", async () => {
    await writeFile(
      path.join(tempHome, "settings.json"),
      JSON.stringify({ pinnedDashboardEnabled: false }),
    );

    await loadSettings();

    expect(getPinnedDashboardEnabled()).toBe(false);
  });

  describe("prompt queue mode", () => {
    it("is off by default", async () => {
      await loadSettings();

      expect(getPromptQueueMode()).toBe("off");
    });

    it("reads the released promptQueueEnabled=true as the bot queue", async () => {
      await writeFile(
        path.join(tempHome, "settings.json"),
        JSON.stringify({ promptQueueEnabled: true }),
      );

      await loadSettings();

      expect(getPromptQueueMode()).toBe("queue");
    });

    it("prefers promptQueueMode over the released promptQueueEnabled", async () => {
      await writeFile(
        path.join(tempHome, "settings.json"),
        JSON.stringify({ promptQueueEnabled: true, promptQueueMode: "off" }),
      );

      await loadSettings();

      expect(getPromptQueueMode()).toBe("off");
    });

    it.each(["queue", "off"] as const)(
      "round-trips promptQueueMode=%s without touching the released flag",
      async (mode) => {
        const settingsPath = path.join(tempHome, "settings.json");
        const original = JSON.stringify({ promptQueueEnabled: true });
        await writeFile(settingsPath, original);
        await loadSettings();

        setPromptQueueMode(mode);
        await flushSettings();

        expect(getPromptQueueMode()).toBe(mode);
        const written = JSON.parse(await readFile(settingsPath, "utf-8"));
        expect(written.promptQueueEnabled).toBe(true);
        expect(written.promptQueueMode).toBe(mode);
      },
    );
  });

  describe("atomic writes and backup recovery", () => {
    const settingsPath = (): string => path.join(tempHome, "settings.json");
    const backupPath = (): string => path.join(tempHome, "settings.json.bak");
    const tempPath = (): string => path.join(tempHome, "settings.json.tmp");

    const exists = async (filePath: string): Promise<boolean> => {
      try {
        await access(filePath);
        return true;
      } catch {
        return false;
      }
    };

    const scheduledTask = (id: string): ScheduledTask => ({
      kind: "cron",
      id,
      projectId: "project-1",
      projectWorktree: "D:/work/project-1",
      agent: "build",
      model: { providerID: "anthropic", modelID: "claude-opus-5", variant: null },
      scheduleText: "every day at 9",
      scheduleSummary: "Every day at 09:00",
      timezone: "UTC",
      prompt: "Run the daily check",
      createdAt: "2026-01-01T00:00:00.000Z",
      nextRunAt: "2026-01-02T09:00:00.000Z",
      lastRunAt: null,
      runCount: 0,
      lastStatus: "idle",
      lastError: null,
      cron: "0 9 * * *",
    });

    it("leaves no backup and no temporary file after the first write", async () => {
      await loadSettings();

      setCompactOutputMode(true);
      await flushSettings();

      expect(await exists(settingsPath())).toBe(true);
      expect(await exists(backupPath())).toBe(false);
      expect(await exists(tempPath())).toBe(false);
    });

    it("keeps the previous version in settings.json.bak on the next write", async () => {
      await loadSettings();

      setCompactOutputMode(true);
      await flushSettings();
      setCompactOutputMode(false);
      await flushSettings();

      const settings = JSON.parse(await readFile(settingsPath(), "utf-8"));
      const backup = JSON.parse(await readFile(backupPath(), "utf-8"));
      expect(settings.compactOutputMode).toBe(false);
      expect(backup.compactOutputMode).toBe(true);
      expect(await exists(tempPath())).toBe(false);
    });

    it("recovers settings from the backup when settings.json is corrupted", async () => {
      await writeFile(settingsPath(), '{"compactOutputMode": tr');
      await writeFile(backupPath(), JSON.stringify({ compactOutputMode: true }));

      await loadSettings();

      expect(getCompactOutputMode()).toBe(true);
    });

    it("recovers settings from the backup when settings.json is missing", async () => {
      await writeFile(backupPath(), JSON.stringify({ showThinkingContent: false }));

      await loadSettings();

      expect(getShowThinkingContent()).toBe(false);
    });

    it("keeps the valid backup on the first write after a recovery", async () => {
      await writeFile(settingsPath(), '{"compactOutputMode": tr');
      await writeFile(backupPath(), JSON.stringify({ compactOutputMode: true }));

      await loadSettings();
      setShowThinkingContent(false);
      await flushSettings();

      const settings = JSON.parse(await readFile(settingsPath(), "utf-8"));
      const backup = JSON.parse(await readFile(backupPath(), "utf-8"));
      expect(settings.compactOutputMode).toBe(true);
      expect(settings.showThinkingContent).toBe(false);
      expect(backup.compactOutputMode).toBe(true);
    });

    it("rotates the backup again on the write after a recovery", async () => {
      await writeFile(settingsPath(), '{"compactOutputMode": tr');
      await writeFile(backupPath(), JSON.stringify({ compactOutputMode: true }));

      await loadSettings();
      setShowThinkingContent(false);
      await flushSettings();
      setShowAssistantRunFooter(false);
      await flushSettings();

      const backup = JSON.parse(await readFile(backupPath(), "utf-8"));
      expect(backup.showThinkingContent).toBe(false);
      expect(backup.showAssistantRunFooter).toBeUndefined();
    });

    it("refuses to start when both settings.json and its backup are corrupted", async () => {
      const corruptedSettings = '{"compactOutputMode": tr';
      const corruptedBackup = '{"compactOutputMode":';
      await writeFile(settingsPath(), corruptedSettings);
      await writeFile(backupPath(), corruptedBackup);

      await expect(loadSettings()).rejects.toThrow(/settings\.json/);

      expect(await readFile(settingsPath(), "utf-8")).toBe(corruptedSettings);
      expect(await readFile(backupPath(), "utf-8")).toBe(corruptedBackup);
    });

    it("refuses to start when settings.json is missing and its backup is unreadable", async () => {
      const corruptedBackup = '{"compactOutputMode":';
      await writeFile(backupPath(), corruptedBackup);

      await expect(loadSettings()).rejects.toThrow(/settings\.json.*\.bak/s);

      expect(await exists(settingsPath())).toBe(false);
      expect(await readFile(backupPath(), "utf-8")).toBe(corruptedBackup);
    });

    it("starts with empty settings when neither file exists", async () => {
      await expect(loadSettings()).resolves.toBeUndefined();

      expect(getCompactOutputMode()).toBe(false);
    });

    it("ignores a corrupted backup when settings.json is readable", async () => {
      await writeFile(settingsPath(), JSON.stringify({ compactOutputMode: true }));
      await writeFile(backupPath(), '{"compactOutputMode": tr');

      await loadSettings();

      expect(getCompactOutputMode()).toBe(true);
    });

    it("keeps scheduled tasks when settings.json is corrupted after a write", async () => {
      await loadSettings();
      await setScheduledTasks([scheduledTask("task-1")]);
      await setScheduledTasks([scheduledTask("task-1"), scheduledTask("task-2")]);

      await writeFile(settingsPath(), '{"scheduledTasks": [');
      __resetSettingsForTests();
      await loadSettings();

      expect(getScheduledTasks().map((task) => task.id)).toEqual(["task-1"]);
    });
  });

  it("persists response streaming mode to settings.json", async () => {
    await loadSettings();

    setResponseStreamingMode("draft");

    expect(getResponseStreamingMode()).toBe("draft");
    await vi.waitFor(async () => {
      const settings = JSON.parse(await readFile(path.join(tempHome, "settings.json"), "utf-8"));
      expect(settings.responseStreamingMode).toBe("draft");
    });
  });
});
