import { logger } from "../../utils/logger.js";
import type { IncomingPrompt } from "../types/prompt.js";

export const MAX_QUEUED_PROMPTS = 5;

/** Number of recently delivered, unmatched Reasonix inbox ids kept for late admissions. */
const MAX_REMEMBERED_DELIVERED_INBOX_IDS = 20;

/** Where a prompt waits in the Reasonix session inbox. */
export interface QueuedPromptInbox {
  sessionId: string;
  inboxId: string;
}

export interface QueuedPrompt extends IncomingPrompt {
  id: string;
  displayText: string;
  responseMode?: "text_only" | "text_and_tts";
  inbox: QueuedPromptInbox;
}

export interface InboxPromptInput {
  displayText: string;
  responseMode?: "text_only" | "text_and_tts";
  inbox: QueuedPromptInbox;
}

export interface QueuedPromptInput extends IncomingPrompt {
  displayText?: string;
  responseMode?: "text_only" | "text_and_tts";
}

/**
 * Prompt Queue - mirrors the prompts waiting in a Reasonix session inbox so the bot can
 * list them, show their position and cancel them. The prompts themselves live in Reasonix;
 * this holds no prompt content beyond the text shown in the list. An admission still on
 * its way holds a reservation so the cap counts it and a clear can withdraw it.
 * Kept in memory only: queued messages must not survive a restart and leak into
 * a different session context.
 * Singleton pattern
 */
class PromptQueueManager {
  private items: QueuedPrompt[] = [];
  private nextId = 1;
  private reservations = new Set<string>();
  /** Reservations handed over at /detach, by the session they were admitted to. */
  private handedOverReservations = new Map<string, string>();
  private deliveredInboxIds: string[] = [];

  /** Holds a slot for an admission to Reasonix; null when the queue is full. */
  reserve(): string | null {
    if (this.isFull()) {
      return null;
    }
    const reservationId = `reserved-${this.nextId++}`;
    this.reservations.add(reservationId);
    return reservationId;
  }

  /**
   * Turns a reservation into a mirror item. Returns null when the reservation is gone:
   * the queue was cleared while the admission was on its way.
   */
  confirmReservation(reservationId: string, input: InboxPromptInput): QueuedPrompt | null {
    if (!this.reservations.delete(reservationId)) {
      return null;
    }

    const item: QueuedPrompt = {
      id: `queued-${this.nextId++}`,
      text: "",
      fileParts: [],
      photos: [],
      displayText: input.displayText.trim() || "[Attachment]",
      inbox: { ...input.inbox },
      ...(input.responseMode ? { responseMode: input.responseMode } : {}),
    };
    this.items.push(item);
    logger.debug(
      `[PromptQueue] Inbox prompt mirrored: id=${item.id}, inboxId=${input.inbox.inboxId}, size=${this.items.length}`,
    );
    return item;
  }

  /** Releases a reservation; returns false when a clear already dropped it. */
  releaseReservation(reservationId: string): boolean {
    return this.reservations.delete(reservationId);
  }

  findByInboxId(inboxId: string): QueuedPrompt | null {
    const item = this.items.find((candidate) => candidate.inbox?.inboxId === inboxId);
    return item ? copyQueuedPrompt(item) : null;
  }

  /** Remembers an inbox id delivered before any item carried it. */
  rememberDeliveredInboxId(inboxId: string): void {
    this.deliveredInboxIds.push(inboxId);
    if (this.deliveredInboxIds.length > MAX_REMEMBERED_DELIVERED_INBOX_IDS) {
      this.deliveredInboxIds.shift();
    }
  }

  wasInboxIdDelivered(inboxId: string): boolean {
    return this.deliveredInboxIds.includes(inboxId);
  }

  list(): QueuedPrompt[] {
    return this.items.map(copyQueuedPrompt);
  }

  removeById(id: string): QueuedPrompt | null {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) {
      return null;
    }

    const [removed] = this.items.splice(index, 1);
    if (!removed) {
      return null;
    }
    logger.debug(
      `[PromptQueue] Prompt removed: id=${removed.id}, position=${index + 1}, size=${this.items.length}`,
    );
    return removed;
  }

  size(): number {
    return this.items.length;
  }

  isFull(): boolean {
    return this.items.length + this.reservations.size >= MAX_QUEUED_PROMPTS;
  }

  /**
   * Empties the queue for /detach and returns the items it removed. Admissions still on
   * their way stay with the detached session: their reservations are handed over rather
   * than dropped, and a later clear leaves them alone.
   */
  handOver(sessionId: string, reason: string): QueuedPrompt[] {
    for (const reservationId of this.reservations) {
      this.handedOverReservations.set(reservationId, sessionId);
    }

    logger.info(
      `[PromptQueue] Handed queue over: reason=${reason}, session=${sessionId}, count=${this.items.length}, reservations=${this.reservations.size}`,
    );
    const removed = this.items;
    this.items = [];
    this.reservations.clear();
    return removed;
  }

  /** Releases a handed-over reservation; returns false when it was not handed over or was withdrawn. */
  releaseHandedOverReservation(reservationId: string): boolean {
    return this.handedOverReservations.delete(reservationId);
  }

  /** Withdraws handed-over reservations of one session, or of all when none is given. */
  withdrawHandedOverReservations(sessionId?: string): void {
    for (const [reservationId, reservedSessionId] of this.handedOverReservations) {
      if (sessionId === undefined || reservedSessionId === sessionId) {
        this.handedOverReservations.delete(reservationId);
      }
    }
  }

  /** Empties the queue, reservations included, and returns the items it removed. */
  clear(reason: string): QueuedPrompt[] {
    this.deliveredInboxIds = [];
    if (this.items.length === 0 && this.reservations.size === 0) {
      return [];
    }

    logger.info(
      `[PromptQueue] Cleared queue: reason=${reason}, count=${this.items.length}, reservations=${this.reservations.size}`,
    );
    const removed = this.items;
    this.items = [];
    this.reservations.clear();
    return removed;
  }

  __resetForTests(): void {
    this.items = [];
    this.nextId = 1;
    this.reservations.clear();
    this.handedOverReservations.clear();
    this.deliveredInboxIds = [];
  }
}

export const promptQueue = new PromptQueueManager();

function copyQueuedPrompt(item: QueuedPrompt): QueuedPrompt {
  return {
    ...item,
    fileParts: [...item.fileParts],
    photos: [...item.photos],
    inbox: { ...item.inbox },
  };
}
