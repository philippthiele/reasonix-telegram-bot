import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_QUEUED_PROMPTS,
  promptQueue,
  type InboxPromptInput,
} from "../../../src/app/managers/prompt-queue-manager.js";

let inboxCounter = 0;

/** Mirrors a prompt Reasonix has accepted, so every item has its own inbox id. */
function inboxPrompt(displayText: string, sessionId = "ses-1"): InboxPromptInput {
  inboxCounter += 1;
  return {
    displayText,
    inbox: { sessionId, inboxId: `inbox-${inboxCounter}` },
  };
}

/** Reserves a slot and confirms it, as the dispatcher does after Reasonix accepted it. */
function admit(displayText: string, sessionId = "ses-1") {
  const reservationId = promptQueue.reserve();
  if (reservationId === null) {
    return null;
  }
  return promptQueue.confirmReservation(reservationId, inboxPrompt(displayText, sessionId));
}

describe("app/managers/prompt-queue-manager", () => {
  beforeEach(() => {
    promptQueue.__resetForTests();
    inboxCounter = 0;
  });

  it("starts empty", () => {
    expect(promptQueue.size()).toBe(0);
    expect(promptQueue.list()).toEqual([]);
    expect(promptQueue.isFull()).toBe(false);
  });

  it("mirrors the display text Reasonix holds, not the prompt content", () => {
    admit("first");
    admit("  second  ");

    expect(promptQueue.list().map((item) => item.displayText)).toEqual(["first", "second"]);
    expect(promptQueue.list().map((item) => item.text)).toEqual(["", ""]);
  });

  it("falls back to a placeholder when there is nothing to show", () => {
    const item = admit("   ");

    expect(item?.displayText).toBe("[Attachment]");
  });

  it("carries the inbox id of the session that holds the prompt", () => {
    const item = admit("first", "ses-9");

    expect(item?.inbox).toEqual({ sessionId: "ses-9", inboxId: "inbox-1" });
    expect(promptQueue.findByInboxId("inbox-1")?.id).toBe(item?.id);
    expect(promptQueue.findByInboxId("inbox-missing")).toBeNull();
  });

  it("counts a reservation towards the cap without showing it", () => {
    for (let index = 0; index < MAX_QUEUED_PROMPTS - 1; index++) {
      admit(`prompt ${index}`);
    }
    const reservationId = promptQueue.reserve();

    expect(reservationId).not.toBeNull();
    expect(promptQueue.isFull()).toBe(true);
    expect(promptQueue.reserve()).toBeNull();
    expect(promptQueue.size()).toBe(MAX_QUEUED_PROMPTS - 1);
  });

  it("confirms a reservation into a mirror item", () => {
    const reservationId = promptQueue.reserve();

    expect(promptQueue.confirmReservation(reservationId!, inboxPrompt("later"))?.displayText).toBe(
      "later",
    );
    expect(promptQueue.size()).toBe(1);
    expect(promptQueue.isFull()).toBe(false);
  });

  it("drops a confirmation whose reservation a clear already took away", () => {
    const reservationId = promptQueue.reserve();
    promptQueue.clear("abort");

    expect(promptQueue.confirmReservation(reservationId!, inboxPrompt("too late"))).toBeNull();
    expect(promptQueue.size()).toBe(0);
  });

  it("rejects prompts beyond the limit", () => {
    for (let index = 0; index < MAX_QUEUED_PROMPTS; index++) {
      expect(admit(`prompt ${index}`)).not.toBeNull();
    }

    expect(promptQueue.isFull()).toBe(true);
    expect(admit("overflow")).toBeNull();
    expect(promptQueue.size()).toBe(MAX_QUEUED_PROMPTS);
  });

  it("removes an item from the middle and keeps the rest in order", () => {
    admit("first");
    const second = admit("second");
    admit("third");

    const removed = promptQueue.removeById(second!.id);

    expect(removed?.displayText).toBe("second");
    expect(promptQueue.list().map((item) => item.displayText)).toEqual(["first", "third"]);
  });

  it("returns null when removing an unknown id", () => {
    admit("first");

    expect(promptQueue.removeById("queued-999")).toBeNull();
  });

  it("returns copies so callers cannot mutate the mirror", () => {
    admit("first");

    const listed = promptQueue.list();
    listed[0]!.displayText = "changed";
    listed[0]!.inbox.inboxId = "changed";

    expect(promptQueue.list()[0]?.displayText).toBe("first");
    expect(promptQueue.list()[0]?.inbox.inboxId).toBe("inbox-1");
  });

  it("remembers inbox ids delivered before any item carried them", () => {
    promptQueue.rememberDeliveredInboxId("inbox-early");

    expect(promptQueue.wasInboxIdDelivered("inbox-early")).toBe(true);
    expect(promptQueue.wasInboxIdDelivered("inbox-other")).toBe(false);
  });

  it("empties the queue and forgets the delivered ids on a clear", () => {
    admit("first");
    admit("second");
    promptQueue.rememberDeliveredInboxId("inbox-early");

    const cleared = promptQueue.clear("abort");

    expect(cleared.map((item) => item.displayText)).toEqual(["first", "second"]);
    expect(promptQueue.size()).toBe(0);
    expect(promptQueue.wasInboxIdDelivered("inbox-early")).toBe(false);
  });

  it("hands the queue over to a detached session without dropping late admissions", () => {
    admit("first");
    const reservationId = promptQueue.reserve();

    const handedOver = promptQueue.handOver("ses-detached", "detach");

    expect(handedOver.map((item) => item.displayText)).toEqual(["first"]);
    expect(promptQueue.size()).toBe(0);
    expect(promptQueue.releaseHandedOverReservation(reservationId!)).toBe(true);
    expect(promptQueue.releaseHandedOverReservation(reservationId!)).toBe(false);
  });

  it("withdraws the reservations of one session only", () => {
    const detached = promptQueue.reserve();
    promptQueue.handOver("ses-detached", "detach");
    const other = promptQueue.reserve();
    promptQueue.handOver("ses-other", "detach");

    promptQueue.withdrawHandedOverReservations("ses-detached");

    expect(promptQueue.releaseHandedOverReservation(detached!)).toBe(false);
    expect(promptQueue.releaseHandedOverReservation(other!)).toBe(true);
  });

  it("leaves a late clear alone once the session was detached", () => {
    const reservationId = promptQueue.reserve();
    promptQueue.handOver("ses-detached", "detach");
    promptQueue.clear("new_session");

    expect(promptQueue.releaseHandedOverReservation(reservationId!)).toBe(true);
  });
});