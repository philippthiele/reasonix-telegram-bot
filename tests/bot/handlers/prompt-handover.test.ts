import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { createIncomingPrompt } from "../../../src/app/types/prompt.js";

const mocked = vi.hoisted(() => ({
  resolveProjectAgentMock: vi.fn(),
  getStoredModelMock: vi.fn(),
  cancelInboxPromptMock: vi.fn(),
  admitHandedOverPromptToInboxMock: vi.fn(),
}));

vi.mock("../../../src/app/services/agent-selection-service.js", () => ({
  getStoredAgent: vi.fn(() => "build"),
  resolveProjectAgent: mocked.resolveProjectAgentMock,
}));

vi.mock("../../../src/app/services/model-selection-service.js", () => ({
  getStoredModel: mocked.getStoredModelMock,
}));

vi.mock("../../../src/app/services/prompt-inbox-service.js", () => ({
  cancelInboxPrompt: mocked.cancelInboxPromptMock,
}));

vi.mock("../../../src/bot/handlers/prompt.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/bot/handlers/prompt.js")>()),
  admitHandedOverPromptToInbox: mocked.admitHandedOverPromptToInboxMock,
}));

import { promptHandover } from "../../../src/app/managers/prompt-handover-manager.js";
import { promptQueue } from "../../../src/app/managers/prompt-queue-manager.js";
import { config } from "../../../src/config.js";
import { t } from "../../../src/i18n/index.js";
import {
  __resetPromptHandoverForTests,
  handOverPreparedPrompt,
  handOverPromptQueue,
  initializePromptHandover,
  withdrawAllHandedOverPrompts,
  withdrawHandedOverPrompts,
} from "../../../src/bot/handlers/prompt-handover.js";
import { createTestAppContainer } from "../../helpers/app-container.js";

const SESSION = { id: "ses-1", title: "Session", directory: "D:/repo" };
const MODEL = { providerID: "p", modelID: "m", variant: "high" };

let inboxCounter = 0;
let sendMessageMock: ReturnType<typeof vi.fn>;
let deps: ReturnType<typeof createDeps>;

function createDeps() {
  return {
    ...createTestAppContainer(),
    bot: { api: { sendMessage: sendMessageMock } } as never,
  };
}

function makeContext(): Context {
  return { chat: { id: 42 }, api: {}, reply: vi.fn() } as unknown as Context;
}

/** Mirrors one prompt Reasonix is holding for the session. */
function mirrorQueuedPrompt(text: string, sessionId = "ses-1"): string {
  inboxCounter += 1;
  const inboxId = `msg-${inboxCounter}`;
  const item = promptQueue.confirmReservation(promptQueue.reserve()!, {
    displayText: text,
    inbox: { sessionId, inboxId },
  });
  if (!item) {
    throw new Error("reservation was rejected");
  }
  return inboxId;
}

beforeEach(() => {
  vi.resetAllMocks();
  inboxCounter = 0;
  promptQueue.__resetForTests();
  promptHandover.__resetForTests();
  __resetPromptHandoverForTests();
  mocked.resolveProjectAgentMock.mockResolvedValue("build");
  mocked.getStoredModelMock.mockReturnValue(MODEL);
  mocked.cancelInboxPromptMock.mockResolvedValue(undefined);
  mocked.admitHandedOverPromptToInboxMock.mockResolvedValue("msg-9");
  sendMessageMock = vi.fn().mockResolvedValue(undefined);
  deps = createDeps();
  initializePromptHandover(deps);
});

describe("bot/handlers/prompt-handover", () => {
  it("leaves the waiting inbox prompts in Reasonix at /detach", async () => {
    mirrorQueuedPrompt("first");
    mirrorQueuedPrompt("second");

    await handOverPromptQueue(SESSION);

    expect(promptQueue.size()).toBe(0);
    expect(promptHandover.get("ses-1")?.inboxEntries.map((entry) => entry.inboxId)).toEqual([
      "msg-1",
      "msg-2",
    ]);
    expect(promptHandover.hasPendingPrompts("ses-1")).toBe(true);
    expect(mocked.cancelInboxPromptMock).not.toHaveBeenCalled();
  });

  it("records the selection the chat had at /detach", async () => {
    mocked.getStoredModelMock.mockReturnValue({ providerID: "x", modelID: "y" });
    await handOverPromptQueue(SESSION);

    expect(promptHandover.get("ses-1")?.selection).toEqual({
      agent: "build",
      providerID: "x",
      modelID: "y",
      variant: undefined,
    });
  });

  it("hands a prompt prepared across /detach over to the session it arrived for", async () => {
    const ticket = promptHandover.takeTicket("ses-1");
    await handOverPromptQueue(SESSION);
    const ctx = makeContext();

    await expect(
      handOverPreparedPrompt(ctx, ticket, createIncomingPrompt("transcribed")),
    ).resolves.toBe(true);

    expect(mocked.admitHandedOverPromptToInboxMock).toHaveBeenCalledWith(
      ctx.api,
      expect.objectContaining({ text: "transcribed" }),
      { id: "ses-1", directory: "D:/repo" },
      { agent: "build", providerID: "p", modelID: "m", variant: "high" },
      deps,
    );
    expect(ctx.reply).not.toHaveBeenCalled();
    expect(promptHandover.get("ses-1")?.inboxEntries).toEqual([
      { sessionId: "ses-1", inboxId: "msg-9" },
    ]);
  });

  it("leaves a prompt that arrived after the detach to the normal path", async () => {
    await handOverPromptQueue(SESSION);
    const ticket = promptHandover.takeTicket("ses-1");

    await expect(
      handOverPreparedPrompt(makeContext(), ticket, createIncomingPrompt("later")),
    ).resolves.toBe(false);
    expect(mocked.admitHandedOverPromptToInboxMock).not.toHaveBeenCalled();
  });

  it("leaves a prompt for a session that was never detached to the normal path", async () => {
    const ticket = promptHandover.takeTicket("ses-2");

    await expect(
      handOverPreparedPrompt(makeContext(), ticket, createIncomingPrompt("elsewhere")),
    ).resolves.toBe(false);
  });

  it("cancels a prompt withdrawn while it was on its way to the detached session", async () => {
    const ticket = promptHandover.takeTicket("ses-1");
    await handOverPromptQueue(SESSION);
    mocked.admitHandedOverPromptToInboxMock.mockImplementation(async () => {
      await withdrawHandedOverPrompts("ses-1", "abort_command");
      return "msg-9";
    });

    await expect(
      handOverPreparedPrompt(makeContext(), ticket, createIncomingPrompt("late")),
    ).resolves.toBe(true);

    expect(mocked.cancelInboxPromptMock).toHaveBeenCalledWith(
      { sessionId: "ses-1", inboxId: "msg-9" },
      "withdrawn_during_handover",
    );
  });

  it("posts nothing about a refused prompt while detached", async () => {
    const ticket = promptHandover.takeTicket("ses-1");
    await handOverPromptQueue(SESSION);
    mocked.admitHandedOverPromptToInboxMock.mockResolvedValue(null);

    await expect(
      handOverPreparedPrompt(makeContext(), ticket, createIncomingPrompt("refused")),
    ).resolves.toBe(true);

    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("posts the failure of a refused prompt once the bot re-attached", async () => {
    const ticket = promptHandover.takeTicket("ses-1");
    await handOverPromptQueue(SESSION);
    mocked.admitHandedOverPromptToInboxMock.mockResolvedValue(null);
    deps.attachManager.attach("ses-1", "D:/repo");

    await expect(
      handOverPreparedPrompt(makeContext(), ticket, createIncomingPrompt("refused")),
    ).resolves.toBe(true);

    expect(sendMessageMock).toHaveBeenCalledWith(
      config.telegram.allowedUserId,
      t("bot.prompt_send_error"),
    );
  });

  it("cancels the handed-over inbox prompts on /abort in that session", async () => {
    const inboxId = mirrorQueuedPrompt("first");
    await handOverPromptQueue(SESSION);

    await withdrawHandedOverPrompts("ses-1", "abort_command");

    expect(mocked.cancelInboxPromptMock).toHaveBeenCalledWith(
      { sessionId: "ses-1", inboxId },
      "abort_command",
    );
    expect(promptHandover.get("ses-1")).toBeNull();
    expect(promptHandover.hasPendingPrompts("ses-1")).toBe(false);
  });

  it("cancels the handed-over inbox prompts of every session on /reasonix_stop", async () => {
    mirrorQueuedPrompt("first");
    await handOverPromptQueue(SESSION);
    // The queue is emptied by the first /detach, so the next prompt waits for the next one.
    mirrorQueuedPrompt("second", "ses-2");
    await handOverPromptQueue({ ...SESSION, id: "ses-2", directory: "D:/other" });

    await withdrawAllHandedOverPrompts("reasonix_stop");

    expect(mocked.cancelInboxPromptMock.mock.calls.map(([entry]) => entry.inboxId)).toEqual([
      "msg-1",
      "msg-2",
    ]);
    expect(promptHandover.get("ses-1")).toBeNull();
    expect(promptHandover.get("ses-2")).toBeNull();
  });
});