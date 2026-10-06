import { beforeEach, describe, expect, it, vi } from "vitest";

const inboxMock = vi.hoisted(() => ({ list: vi.fn(), cancel: vi.fn() }));

vi.mock("../../../src/reasonix/client.js", () => ({
  reasonixClient: { session: { inbox: inboxMock } },
}));

import { promptQueue, type QueuedPrompt } from "../../../src/app/managers/prompt-queue-manager.js";
import {
  reconcileInboxPrompts,
  withdrawInboxPrompt,
  withdrawPromptQueue,
} from "../../../src/app/services/prompt-inbox-service.js";

function mirror(inboxId: string, sessionId = "ses-1"): QueuedPrompt {
  const item = promptQueue.confirmReservation(promptQueue.reserve()!, {
    displayText: inboxId,
    inbox: { sessionId, inboxId },
  });
  return item!;
}

describe("app/services/prompt-inbox-service", () => {
  beforeEach(() => {
    promptQueue.__resetForTests();
    inboxMock.list.mockReset().mockResolvedValue({ data: [], error: undefined });
    inboxMock.cancel.mockReset().mockResolvedValue({ data: true, error: undefined });
  });

  describe("withdrawInboxPrompt", () => {
    it("cancels a prompt still waiting and drops its button", async () => {
      const item = mirror("msg-1");
      inboxMock.list.mockResolvedValue({ data: ["msg-1"], error: undefined });

      await expect(withdrawInboxPrompt(item)).resolves.toBe("removed");

      expect(inboxMock.cancel).toHaveBeenCalledWith({ sessionID: "ses-1", inboxID: "msg-1" });
      expect(promptQueue.size()).toBe(0);
    });

    it("reports a prompt the turn already picked up and does not cancel it", async () => {
      const item = mirror("msg-1");

      await expect(withdrawInboxPrompt(item)).resolves.toBe("gone");

      expect(inboxMock.cancel).not.toHaveBeenCalled();
      expect(promptQueue.size()).toBe(0);
    });

    it("keeps the button when Reasonix cannot be asked", async () => {
      const item = mirror("msg-1");
      inboxMock.list.mockResolvedValue({ data: undefined, error: new Error("offline") });

      await expect(withdrawInboxPrompt(item)).resolves.toBe("failed");

      expect(promptQueue.size()).toBe(1);
    });

    it("keeps the button when the cancel is refused", async () => {
      const item = mirror("msg-1");
      inboxMock.list.mockResolvedValue({ data: ["msg-1"], error: undefined });
      inboxMock.cancel.mockResolvedValue({ data: undefined, error: new Error("refused") });

      await expect(withdrawInboxPrompt(item)).resolves.toBe("failed");

      expect(promptQueue.size()).toBe(1);
    });
  });

  describe("withdrawPromptQueue", () => {
    it("clears the queue and cancels every mirrored prompt", async () => {
      mirror("msg-1");
      mirror("msg-2");

      await withdrawPromptQueue("abort_command");

      expect(promptQueue.size()).toBe(0);
      expect(inboxMock.cancel).toHaveBeenCalledTimes(2);
      expect(inboxMock.cancel).toHaveBeenCalledWith({ sessionID: "ses-1", inboxID: "msg-2" });
    });

    it("only clears prompts that reached the inbox", async () => {
      mirror("msg-in-inbox");
      // An admission still on its way only holds a reservation, so there is nothing to cancel.
      promptQueue.reserve();

      await withdrawPromptQueue("session_switched");

      expect(promptQueue.size()).toBe(0);
      expect(inboxMock.cancel).toHaveBeenCalledTimes(1);
    });

    it("cancels nothing when the queue only holds reservations", async () => {
      promptQueue.reserve();
      promptQueue.reserve();

      await withdrawPromptQueue("session_switched");

      expect(promptQueue.size()).toBe(0);
      expect(inboxMock.cancel).not.toHaveBeenCalled();
    });

    it("clears the queue even when Reasonix is unreachable", async () => {
      mirror("msg-1");
      inboxMock.cancel.mockRejectedValue(new Error("offline"));

      await expect(withdrawPromptQueue("reasonix_stop")).resolves.toBeUndefined();

      expect(promptQueue.size()).toBe(0);
    });
  });

  describe("reconcileInboxPrompts", () => {
    it("drops buttons of prompts no longer waiting in the session inbox", async () => {
      mirror("msg-1");
      mirror("msg-2");
      mirror("msg-3", "ses-other");
      inboxMock.list.mockResolvedValue({ data: ["msg-2"], error: undefined });

      await reconcileInboxPrompts("ses-1");

      expect(promptQueue.list().map((item) => item.inbox?.inboxId)).toEqual(["msg-2", "msg-3"]);
    });

    it("does not ask Reasonix when nothing is mirrored for the session", async () => {
      await reconcileInboxPrompts("ses-1");

      expect(inboxMock.list).not.toHaveBeenCalled();
    });
  });
});
