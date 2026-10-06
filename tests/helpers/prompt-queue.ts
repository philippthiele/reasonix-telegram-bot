import { promptQueue, type QueuedPrompt } from "../../src/app/managers/prompt-queue-manager.js";
import { createIncomingPrompt } from "../../src/app/types/prompt.js";

/**
 * Mirrors an inbox entry the way the real admission path does, so tests do not have to
 * know that a mirror item needs a reservation first.
 */
export function mirrorInboxPrompt(input: {
  inboxId: string;
  sessionId?: string;
  displayText?: string;
}): QueuedPrompt {
  const reservation = promptQueue.reserve();
  if (!reservation) {
    throw new Error("queue is full");
  }

  const item = promptQueue.confirmReservation(reservation, {
    displayText: input.displayText ?? input.inboxId,
    inbox: { sessionId: input.sessionId ?? "session-1", inboxId: input.inboxId },
  });
  if (!item) {
    throw new Error("reservation was gone before it was confirmed");
  }

  return item;
}

/** Mirrors a queued prompt that carries prompt content, for tests that need the text. */
export function mirrorQueuedPrompt(text: string, inboxId = `msg-${text}`): QueuedPrompt {
  const reservation = promptQueue.reserve();
  if (!reservation) {
    throw new Error("queue is full");
  }

  const item = promptQueue.confirmReservation(reservation, {
    ...createIncomingPrompt(text),
    displayText: text,
    inbox: { sessionId: "session-1", inboxId },
  });
  if (!item) {
    throw new Error("reservation was gone before it was confirmed");
  }

  return item;
}

/** Mirrors `count` inbox entries, e.g. to fill the queue up. */
export function mirrorInboxPrompts(count: number, prefix = "msg"): QueuedPrompt[] {
  return Array.from({ length: count }, (_, index) => mirrorInboxPrompt({ inboxId: `${prefix}-${index}` }));
}