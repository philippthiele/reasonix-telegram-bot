/**
 * Permission request from Reasonix (maps to SDK PermissionRequest)
 */
export interface PermissionRequest {
  id: string; // Request ID for reply
  sessionID: string;
  permission: string; // "bash", "edit", "webfetch", etc.
  patterns: Array<string>; // Commands/files being requested
  metadata: { [key: string]: unknown }; // Additional context
  always: Array<string>; // Already approved patterns
  tool?: {
    messageID: string;
    callID: string;
  };
}

/**
 * A visible Telegram permission prompt that groups equivalent Reasonix requests
 */
export interface GroupedPermissionMessage {
  messageId: number; // Telegram message ID showing the prompt
  request: PermissionRequest; // The request the visible prompt was rendered from
  count: number; // Number of Reasonix requests grouped behind the prompt
}

/**
 * Possible permission responses
 */
export type PermissionReply = "once" | "always" | "reject";

/**
 * How a permission prompt ended: answered (here or outside Telegram), settled outside
 * Telegram with the decision unknown, or dropped without an answer
 */
export type PermissionOutcome =
  | { kind: "replied"; reply: PermissionReply; outside: boolean }
  | { kind: "settled_outside" }
  | { kind: "not_answered" };

/**
 * A visible prompt whose Reasonix requests changed: it ended with an outcome, or it
 * stays open with fewer grouped requests
 */
export interface PermissionPromptChange {
  messageId: number;
  request: PermissionRequest;
  openCount: number;
  outcome: PermissionOutcome | null;
}

/**
 * An answer tapped in Telegram that is on its way to Reasonix
 */
export interface PermissionSend {
  reply: PermissionReply;
  requestIds: string[];
  settlesSession: boolean; // A reject settles every pending request of the session
}

/**
 * State for active permission requests
 */
export interface PermissionState {
  requestsByMessageId: Map<number, PermissionRequest>; // Telegram message ID -> request
  requestIdsByMessageId: Map<number, string[]>; // Telegram message ID -> open Reasonix request IDs
  messageIdBySignature: Map<string, number>; // Equivalent permission signature -> Telegram message ID
  sendsByMessageId: Map<number, PermissionSend>; // Telegram message ID -> answer being sent
}
