import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { createIncomingPrompt } from "../../../src/app/types/prompt.js";
import { t } from "../../../src/i18n/index.js";

const mocked = vi.hoisted(() => ({
  admitPromptToInbox: vi.fn(),
  startInboxPromptRun: vi.fn(),
  handOverPreparedPrompt: vi.fn(),
  getPromptQueueMode: vi.fn(),
  isForegroundBusy: vi.fn(),
  cancelInboxPrompt: vi.fn(),
  reconcileInboxPrompts: vi.fn(),
  getCurrentSession: vi.fn(),
  getKeyboard: vi.fn(),
}));

vi.mock("../../../src/bot/handlers/prompt.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/bot/handlers/prompt.js")>()),
  admitPromptToInbox: mocked.admitPromptToInbox,
  startInboxPromptRun: mocked.startInboxPromptRun,
}));

vi.mock("../../../src/bot/handlers/prompt-handover.js", () => ({
  handOverPreparedPrompt: mocked.handOverPreparedPrompt,
}));

vi.mock("../../../src/app/stores/settings-store.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/app/stores/settings-store.js")>()),
  getPromptQueueMode: mocked.getPromptQueueMode,
}));

vi.mock("../../../src/app/services/run-control-service.js", () => ({
  isForegroundBusy: mocked.isForegroundBusy,
}));

vi.mock("../../../src/app/services/prompt-inbox-service.js", () => ({
  cancelInboxPrompt: mocked.cancelInboxPrompt,
  reconcileInboxPrompts: mocked.reconcileInboxPrompts,
}));

vi.mock("../../../src/app/services/session-service.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/app/services/session-service.js")>()),
  getCurrentSession: mocked.getCurrentSession,
}));

import { MAX_QUEUED_PROMPTS, promptQueue } from "../../../src/app/managers/prompt-queue-manager.js";
import { promptHandover } from "../../../src/app/managers/prompt-handover-manager.js";
import {
  __resetPromptQueueDispatchForTests,
  canQueueMediaPrompt,
  dispatchNextQueuedPrompt,
  initializePromptQueueDispatch,
  rejectQueuedMediaBeforePreparation,
  shouldSuggestPromptQueue as shouldSuggestPromptQueueInput,
  takeArrivalTicket,
  tryEnqueuePrompt,
  tryEnqueuePromptIfBusy,
} from "../../../src/bot/handlers/prompt-queue-dispatch.js";
import type { AppContainer } from "../../../src/app/bootstrap/app-container.js";
import { createTestAppContainer } from "../../helpers/app-container.js";

const KEYBOARD = { keyboard: [] };
const SESSION = { id: "ses-1", title: "Session", directory: "D:/repo" };
const SELECTION = { agent: "build", providerID: "p", modelID: "m" };

const DEPS = {
  ...createTestAppContainer({
    keyboardManager: {
      getKeyboard: mocked.getKeyboard,
    } as unknown as AppContainer["keyboardManager"],
  }),
  bot: {} as never,
};

let replyMock: ReturnType<typeof vi.fn>;

function makeContext(): Context {
  return { chat: { id: 42 }, api: {}, reply: replyMock } as unknown as Context;
}

function shouldSuggestPromptQueue(text: string): boolean {
  return shouldSuggestPromptQueueInput(createIncomingPrompt(text));
}

describe("bot/handlers/prompt-queue-dispatch", () => {
  beforeEach(() => {
    promptQueue.__resetForTests();
    promptHandover.__resetForTests();
    __resetPromptQueueDispatchForTests();
    DEPS.assistantRunState.clearAll("test");
    replyMock = vi.fn().mockResolvedValue(undefined);
    mocked.admitPromptToInbox
      .mockReset()
      .mockResolvedValue({ sessionId: "ses-1", inboxId: "msg-1" });
    mocked.startInboxPromptRun.mockReset().mockResolvedValue(undefined);
    mocked.handOverPreparedPrompt.mockReset().mockResolvedValue(true);
    mocked.getPromptQueueMode.mockReset().mockReturnValue("queue");
    mocked.isForegroundBusy.mockReset().mockReturnValue(true);
    mocked.cancelInboxPrompt.mockReset().mockResolvedValue(undefined);
    mocked.reconcileInboxPrompts.mockReset().mockResolvedValue(undefined);
    mocked.getCurrentSession.mockReset().mockReturnValue(SESSION);
    mocked.getKeyboard.mockReset().mockReturnValue(KEYBOARD);
    initializePromptQueueDispatch(DEPS);
  });

  describe("tryEnqueuePrompt", () => {
    it("sends the prompt into the session inbox and mirrors it as a queue item", async () => {
      const ctx = makeContext();

      const handled = await tryEnqueuePrompt(ctx, createIncomingPrompt("Also check the tests"));

      expect(handled).toBe(true);
      expect(mocked.admitPromptToInbox).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ text: "Also check the tests" }),
        DEPS,
      );
      expect(promptQueue.findByInboxId("msg-1")).toMatchObject({
        displayText: "Also check the tests",
        inbox: { sessionId: "ses-1", inboxId: "msg-1" },
      });
      expect(replyMock).toHaveBeenCalledWith(
        t("queue.added", { count: "1", max: String(MAX_QUEUED_PROMPTS) }),
        { reply_markup: KEYBOARD },
      );
    });

    it("shows the display text of an attachment-only prompt", async () => {
      await tryEnqueueInputWithDisplayText("release screenshot");

      expect(promptQueue.list().map((item) => item.displayText)).toEqual([
        "release screenshot",
      ]);
    });

    it("does nothing when the setting is disabled", async () => {
      mocked.getPromptQueueMode.mockReturnValue("off");

      await expect(
        tryEnqueuePrompt(makeContext(), createIncomingPrompt("do the thing")),
      ).resolves.toBe(false);
      expect(promptQueue.size()).toBe(0);
      expect(replyMock).not.toHaveBeenCalled();
    });

    it("refuses the sixth waiting prompt without sending it", async () => {
      for (let index = 0; index < MAX_QUEUED_PROMPTS; index++) {
        promptQueue.confirmReservation(promptQueue.reserve()!, {
          displayText: `waiting ${index}`,
          inbox: { sessionId: "ses-1", inboxId: `msg-${index}` },
        });
      }

      await tryEnqueuePrompt(makeContext(), createIncomingPrompt("One more"));

      expect(mocked.admitPromptToInbox).not.toHaveBeenCalled();
      expect(promptQueue.size()).toBe(MAX_QUEUED_PROMPTS);
      expect(replyMock).toHaveBeenCalledWith(t("queue.full", { max: String(MAX_QUEUED_PROMPTS) }), {
        reply_markup: KEYBOARD,
      });
    });

    it("releases the slot and adds no button when Reasonix refuses the prompt", async () => {
      mocked.admitPromptToInbox.mockResolvedValue(null);

      const handled = await tryEnqueuePrompt(makeContext(), createIncomingPrompt("Refused"));

      expect(handled).toBe(true);
      expect(promptQueue.size()).toBe(0);
      for (let index = 0; index < MAX_QUEUED_PROMPTS; index++) {
        expect(promptQueue.reserve()).not.toBeNull();
      }
      expect(replyMock).not.toHaveBeenCalled();
    });

    it("never queues commands, blank text, or reply keyboard button presses", async () => {
      const ctx = makeContext();

      for (const text of [
        "/status",
        "   ",
        "🧠 openrouter\nopenai/gpt-4o",
        "🛠️ Build Agent",
        "❌ 1. queued",
      ]) {
        await expect(tryEnqueuePrompt(ctx, createIncomingPrompt(text))).resolves.toBe(false);
      }

      expect(promptQueue.size()).toBe(0);
    });
  });

  describe("late admissions", () => {
    it("leaves a prompt on its way at /detach with that session, even after a switch", async () => {
      mocked.admitPromptToInbox.mockImplementation(async () => {
        promptHandover.recordDetach(SESSION, SELECTION);
        promptQueue.handOver("ses-1", "detach_command");
        promptQueue.clear("session_switched");
        return { sessionId: "ses-1", inboxId: "msg-1" };
      });

      await tryEnqueuePrompt(makeContext(), createIncomingPrompt("Right before detach"));

      expect(mocked.cancelInboxPrompt).not.toHaveBeenCalled();
      expect(replyMock).not.toHaveBeenCalled();
      expect(promptQueue.size()).toBe(0);
      expect(promptHandover.get("ses-1")?.inboxEntries).toEqual([
        { sessionId: "ses-1", inboxId: "msg-1" },
      ]);
    });

    it("cancels a prompt on its way at /detach once the hand-over is withdrawn", async () => {
      mocked.admitPromptToInbox.mockImplementation(async () => {
        promptHandover.recordDetach(SESSION, SELECTION);
        promptQueue.handOver("ses-1", "detach_command");
        promptQueue.withdrawHandedOverReservations("ses-1");
        promptHandover.withdraw("ses-1", "abort_command");
        return { sessionId: "ses-1", inboxId: "msg-1" };
      });

      await tryEnqueuePrompt(makeContext(), createIncomingPrompt("Withdrawn"));

      expect(mocked.cancelInboxPrompt).toHaveBeenCalledWith(
        { sessionId: "ses-1", inboxId: "msg-1" },
        "withdrawn_during_admission",
      );
    });

    it("cancels a prompt whose queue was cleared while it was on its way", async () => {
      mocked.admitPromptToInbox.mockImplementation(async () => {
        promptQueue.clear("abort_command");
        return { sessionId: "ses-1", inboxId: "msg-1" };
      });

      await tryEnqueuePrompt(makeContext(), createIncomingPrompt("Too late"));

      expect(mocked.cancelInboxPrompt).toHaveBeenCalledWith(
        { sessionId: "ses-1", inboxId: "msg-1" },
        "withdrawn_during_admission",
      );
      expect(promptQueue.size()).toBe(0);
      expect(replyMock).not.toHaveBeenCalled();
    });
  });

  describe("a prompt picked up before the send answered", () => {
    it("opens a run and adds no button when Reasonix delivered the prompt at once", async () => {
      mocked.admitPromptToInbox.mockImplementation(async () => {
        promptQueue.rememberDeliveredInboxId("msg-1");
        return { sessionId: "ses-1", inboxId: "msg-1" };
      });

      await tryEnqueuePrompt(makeContext(), createIncomingPrompt("Picked up at once"));

      expect(promptQueue.size()).toBe(0);
      expect(mocked.startInboxPromptRun).toHaveBeenCalledWith(SESSION, DEPS, undefined);
      expect(replyMock).toHaveBeenCalledTimes(1);
    });

    it("does not open a second run when one is already open for a prompt delivered first", async () => {
      DEPS.assistantRunState.startRun("ses-1", { startedAt: Date.now() });
      mocked.admitPromptToInbox.mockImplementation(async () => {
        promptQueue.rememberDeliveredInboxId("msg-1");
        return { sessionId: "ses-1", inboxId: "msg-1" };
      });

      await tryEnqueuePrompt(makeContext(), createIncomingPrompt("Mid-turn"));

      expect(mocked.startInboxPromptRun).not.toHaveBeenCalled();
    });

    it("opens the prompt's own run in place of a turn the bot did not start", async () => {
      DEPS.assistantRunState.startObservedRun("ses-1", Date.now());
      mocked.admitPromptToInbox.mockImplementation(async () => {
        promptQueue.rememberDeliveredInboxId("msg-1");
        return { sessionId: "ses-1", inboxId: "msg-1" };
      });

      await tryEnqueuePrompt(makeContext(), createIncomingPrompt("Mid-turn"));

      expect(mocked.startInboxPromptRun).toHaveBeenCalledWith(SESSION, DEPS, undefined);
    });
  });

  describe("queued media", () => {
    it("does not apply a media cap to prompts that wait in the Reasonix inbox", async () => {
      await expect(rejectQueuedMediaBeforePreparation(makeContext())).resolves.toBe(false);
    });

    it("still refuses media before preparation when the queue is full", async () => {
      for (let index = 0; index < MAX_QUEUED_PROMPTS; index++) {
        promptQueue.reserve();
      }

      await expect(rejectQueuedMediaBeforePreparation(makeContext())).resolves.toBe(true);
    });

    it("queues voice, audio, photo, and document messages while enabled", () => {
      for (const message of [
        { voice: {} },
        { audio: {} },
        { photo: [{}] },
        { document: {} },
      ]) {
        expect(canQueueMediaPrompt({ message } as unknown as Context)).toBe(true);
      }
    });

    it("does not queue plain text messages or anything while disabled", () => {
      expect(canQueueMediaPrompt({ message: { text: "hello" } } as unknown as Context)).toBe(false);

      mocked.getPromptQueueMode.mockReturnValue("off");
      expect(canQueueMediaPrompt({ message: { voice: {} } } as unknown as Context)).toBe(false);
    });
  });

  describe("shouldSuggestPromptQueue", () => {
    it("suggests the queue for a plain prompt while the setting is disabled", () => {
      mocked.getPromptQueueMode.mockReturnValue("off");

      expect(shouldSuggestPromptQueue("do the thing")).toBe(true);
    });

    it("stays quiet once the setting is enabled", () => {
      expect(shouldSuggestPromptQueue("do the thing")).toBe(false);
    });

    it("stays quiet for commands, blank text, and button presses", () => {
      mocked.getPromptQueueMode.mockReturnValue("off");

      expect(shouldSuggestPromptQueue("/status")).toBe(false);
      expect(shouldSuggestPromptQueue("   ")).toBe(false);
      expect(shouldSuggestPromptQueue("🧠 openrouter\nopenai/gpt-4o")).toBe(false);
      expect(shouldSuggestPromptQueue("🛠️ Build Agent")).toBe(false);
      expect(shouldSuggestPromptQueue("📊 150K / 1.5M (10%)")).toBe(false);
      expect(shouldSuggestPromptQueue("❌ 1. queued")).toBe(false);
    });
  });

  describe("prompts handed over at /detach", () => {
    it("queues a message sent after re-attaching behind them while the session is idle", async () => {
      mocked.isForegroundBusy.mockReturnValue(false);
      promptHandover.recordDetach(SESSION, SELECTION);
      promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-1" });

      await expect(
        tryEnqueuePromptIfBusy(makeContext(), createIncomingPrompt("after re-attach")),
      ).resolves.toBe(true);

      expect(promptQueue.list().map((item) => item.displayText)).toEqual(["after re-attach"]);
    });

    it("leaves messages of another session alone", async () => {
      mocked.isForegroundBusy.mockReturnValue(false);
      promptHandover.recordDetach(SESSION, SELECTION);
      promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-1" });
      mocked.getCurrentSession.mockReturnValue({ ...SESSION, id: "ses-2" });

      await expect(
        tryEnqueuePromptIfBusy(makeContext(), createIncomingPrompt("elsewhere")),
      ).resolves.toBe(false);
    });

    it("takes an arrival ticket only while the message would wait", () => {
      mocked.isForegroundBusy.mockReturnValue(false);
      expect(takeArrivalTicket()).toBeUndefined();

      mocked.isForegroundBusy.mockReturnValue(true);
      expect(takeArrivalTicket()).toEqual({ sessionId: "ses-1", detachSeq: 0 });

      mocked.getPromptQueueMode.mockReturnValue("off");
      expect(takeArrivalTicket()).toBeUndefined();
    });

    it("hands a message prepared across /detach over to its session instead of queueing it", async () => {
      const ticket = takeArrivalTicket();
      promptHandover.recordDetach(SESSION, SELECTION);
      mocked.getCurrentSession.mockReturnValue(undefined);
      mocked.isForegroundBusy.mockReturnValue(false);

      const ctx = makeContext();
      const input = createIncomingPrompt("transcribed");

      await expect(tryEnqueuePromptIfBusy(ctx, input, ticket)).resolves.toBe(true);

      expect(mocked.handOverPreparedPrompt).toHaveBeenCalledWith(ctx, ticket, input);
      expect(promptQueue.size()).toBe(0);
      expect(replyMock).not.toHaveBeenCalled();
    });

    it("keeps the normal path for a ticket whose session was not detached since", async () => {
      const ticket = takeArrivalTicket();

      await expect(
        tryEnqueuePromptIfBusy(makeContext(), createIncomingPrompt("still busy"), ticket),
      ).resolves.toBe(true);

      expect(mocked.handOverPreparedPrompt).not.toHaveBeenCalled();
      expect(promptQueue.list().map((item) => item.displayText)).toEqual(["still busy"]);
    });
  });

  describe("dispatchNextQueuedPrompt", () => {
    it("reconciles the mirror instead of dispatching when the session goes idle", async () => {
      mocked.isForegroundBusy.mockReturnValue(false);

      await dispatchNextQueuedPrompt();

      expect(mocked.reconcileInboxPrompts).toHaveBeenCalledWith("ses-1");
    });

    it("does nothing when there is no current session", async () => {
      mocked.getCurrentSession.mockReturnValue(undefined);

      await dispatchNextQueuedPrompt();

      expect(mocked.reconcileInboxPrompts).not.toHaveBeenCalled();
    });
  });
});

/** Admits a prompt whose file parts are never sent to Reasonix, only mirrored. */
async function tryEnqueueInputWithDisplayText(displayText: string): Promise<void> {
  const input = {
    ...createIncomingPrompt("inspect this", {
      fileParts: [
        {
          type: "file" as const,
          mime: "image/jpeg",
          filename: "photo.jpg",
          url: "data:image/jpeg;base64,cGhvdG8=",
        },
      ],
    }),
    displayText,
  };
  await tryEnqueuePrompt(makeContext(), input);
}