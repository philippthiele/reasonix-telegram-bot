import { beforeEach, describe, expect, it } from "vitest";
import { promptHandover } from "../../../src/app/managers/prompt-handover-manager.js";

const SESSION = { id: "ses-1", directory: "D:/repo" };
const SELECTION = { agent: "build", providerID: "p", modelID: "m", variant: "high" };

describe("app/managers/prompt-handover-manager", () => {
  beforeEach(() => {
    promptHandover.__resetForTests();
  });

  it("accepts nothing for a session that was never detached", () => {
    expect(promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-1" })).toBe(false);
    expect(promptHandover.hasPendingPrompts("ses-1")).toBe(false);
  });

  it("reports pending prompts while Reasonix still holds them", () => {
    promptHandover.recordDetach(SESSION, SELECTION);

    expect(promptHandover.hasPendingPrompts("ses-1")).toBe(false);
    promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-1" });
    promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-2" });
    expect(promptHandover.hasPendingPrompts("ses-1")).toBe(true);

    promptHandover.forgetInboxId("msg-1");
    expect(promptHandover.hasPendingPrompts("ses-1")).toBe(true);

    promptHandover.forgetInboxId("msg-2");
    expect(promptHandover.hasPendingPrompts("ses-1")).toBe(false);
  });

  it("follows a ticket to its session only when that session was detached after it", () => {
    const before = promptHandover.takeTicket("ses-1");
    promptHandover.recordDetach(SESSION, SELECTION);
    const after = promptHandover.takeTicket("ses-1");

    expect(promptHandover.wasDetachedSince(before)).toBe(true);
    expect(promptHandover.wasDetachedSince(after)).toBe(false);
    expect(promptHandover.wasDetachedSince({ sessionId: "ses-2", detachSeq: 0 })).toBe(false);
  });

  it("forgets an inbox entry once Reasonix picked it up", () => {
    promptHandover.recordDetach(SESSION, SELECTION);
    promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-1" });
    promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-2" });

    promptHandover.forgetInboxId("msg-1");

    expect(promptHandover.withdraw("ses-1", "abort_command")).toEqual([
      { sessionId: "ses-1", inboxId: "msg-2" },
    ]);
  });

  it("withdraws one session and leaves the others", () => {
    promptHandover.recordDetach(SESSION, SELECTION);
    promptHandover.recordDetach({ id: "ses-2", directory: "D:/other" }, SELECTION);
    promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-1" });
    promptHandover.addInboxEntry({ sessionId: "ses-2", inboxId: "msg-2" });

    promptHandover.withdraw("ses-1", "abort_command");

    expect(promptHandover.get("ses-1")).toBeNull();
    expect(promptHandover.hasPendingPrompts("ses-2")).toBe(true);
  });

  it("withdraws every session and returns all their inbox entries", () => {
    promptHandover.recordDetach(SESSION, SELECTION);
    promptHandover.recordDetach({ id: "ses-2", directory: "D:/other" }, SELECTION);
    promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-1" });
    promptHandover.addInboxEntry({ sessionId: "ses-2", inboxId: "msg-2" });

    const withdrawn = promptHandover.withdrawAll("reasonix_stop");

    expect(withdrawn.map((entry) => entry.inboxId)).toEqual(["msg-1", "msg-2"]);
    expect(promptHandover.get("ses-1")).toBeNull();
    expect(promptHandover.get("ses-2")).toBeNull();
  });

  it("keeps earlier inbox prompts when the same session is detached again", () => {
    promptHandover.recordDetach(SESSION, SELECTION);
    promptHandover.addInboxEntry({ sessionId: "ses-1", inboxId: "msg-1" });

    promptHandover.recordDetach(SESSION, { ...SELECTION, modelID: "other" });

    expect(promptHandover.get("ses-1")?.selection.modelID).toBe("other");
    expect(promptHandover.get("ses-1")?.inboxEntries).toEqual([
      { sessionId: "ses-1", inboxId: "msg-1" },
    ]);
  });
});