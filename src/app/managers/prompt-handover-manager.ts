import { logger } from "../../utils/logger.js";
import type { QueuedPromptInbox } from "./prompt-queue-manager.js";

/** Agent, model and variant the chat had when the session was detached. */
export interface HandoverSelection {
  agent: string | undefined;
  providerID: string;
  modelID: string;
  variant?: string | undefined;
}

/** What waits for one session the bot was detached from. */
export interface SessionHandover {
  sessionId: string;
  directory: string;
  selection: HandoverSelection;
  inboxEntries: QueuedPromptInbox[];
  detachSeq: number;
}

/** The busy session a message arrived for, taken before the message is prepared. */
export interface ArrivalTicket {
  sessionId: string;
  detachSeq: number;
}

/**
 * Prompt Handover - prompts that waited for a running turn in a session the bot was
 * detached from. They stay in the Reasonix inbox of that session, and the bot only
 * remembers them so /abort in that session and /reasonix_stop can withdraw them.
 * No buttons, no cap, and session switches do not withdraw them.
 * Kept in memory only, like the prompt queue.
 * Singleton pattern
 */
class PromptHandoverManager {
  private sessions = new Map<string, SessionHandover>();
  private detachSeq = 0;

  /** Records a detach from the session; later messages prepared for it follow it there. */
  recordDetach(
    session: { id: string; directory: string },
    selection: HandoverSelection,
  ): SessionHandover {
    this.detachSeq += 1;
    const existing = this.sessions.get(session.id);
    if (existing) {
      existing.directory = session.directory;
      existing.selection = { ...selection };
      existing.detachSeq = this.detachSeq;
      return existing;
    }

    const record: SessionHandover = {
      sessionId: session.id,
      directory: session.directory,
      selection: { ...selection },
      inboxEntries: [],
      detachSeq: this.detachSeq,
    };
    this.sessions.set(session.id, record);
    return record;
  }

  get(sessionId: string): SessionHandover | null {
    return this.sessions.get(sessionId) ?? null;
  }

  takeTicket(sessionId: string): ArrivalTicket {
    return { sessionId, detachSeq: this.detachSeq };
  }

  /** Whether the ticket's session was detached after the message arrived. */
  wasDetachedSince(ticket: ArrivalTicket): boolean {
    const record = this.sessions.get(ticket.sessionId);
    return Boolean(record && record.detachSeq > ticket.detachSeq);
  }

  addInboxEntry(inbox: QueuedPromptInbox): boolean {
    const record = this.sessions.get(inbox.sessionId);
    if (!record) {
      return false;
    }
    record.inboxEntries.push({ ...inbox });
    logger.debug(
      `[PromptHandover] Inbox prompt handed over: session=${inbox.sessionId}, inboxId=${inbox.inboxId}`,
    );
    return true;
  }

  /** Whether Reasonix still holds prompts handed over to the session. */
  hasPendingPrompts(sessionId: string): boolean {
    const record = this.sessions.get(sessionId);
    return Boolean(record && record.inboxEntries.length > 0);
  }

  /** Reasonix picked the prompt up: it can no longer be withdrawn. */
  forgetInboxId(inboxId: string): void {
    for (const record of this.sessions.values()) {
      record.inboxEntries = record.inboxEntries.filter((entry) => entry.inboxId !== inboxId);
    }
  }

  /** Drops everything handed over to the session; returns the inbox entries to cancel. */
  withdraw(sessionId: string, reason: string): QueuedPromptInbox[] {
    const record = this.sessions.get(sessionId);
    if (!record) {
      return [];
    }
    this.sessions.delete(sessionId);
    logger.info(
      `[PromptHandover] Withdrew handed-over prompts: session=${sessionId}, reason=${reason}, inbox=${record.inboxEntries.length}`,
    );
    return record.inboxEntries;
  }

  withdrawAll(reason: string): QueuedPromptInbox[] {
    return [...this.sessions.keys()].flatMap((sessionId) => this.withdraw(sessionId, reason));
  }

  __resetForTests(): void {
    this.sessions.clear();
    this.detachSeq = 0;
  }
}

export const promptHandover = new PromptHandoverManager();
