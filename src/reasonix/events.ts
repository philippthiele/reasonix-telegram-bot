import type { Event } from "@opencode-ai/sdk/v2";
import { logger } from "../utils/logger.js";
import { toPermission, toQuestion, toToolPart, toTodos, toolTitle } from "./mappers.js";
import type { ReasonixEvent, ReasonixTool } from "./types.js";

/**
 * Turns Reasonix's frames into the SDK event shapes the bot already understands.
 *
 * Reasonix reports a turn as deltas plus one final snapshot per message, while
 * the bot's aggregators expect per-message parts and OpenCode's lifecycle
 * events. This class is the only place that knows both dialects; it keeps the
 * little state needed to join deltas to their message and to notice the edges
 * of a running turn.
 */
export class ReasonixEventTranslator {
  /** The workspace a frame belongs to; Reasonix reports in-memory sessions without a path. */
  constructor(private readonly root: string = "") {}

  private readonly runningBySession = new Map<string, boolean>();
  private readonly toolByCallId = new Map<
    string,
    { name: string; input: Record<string, unknown> }
  >();
  private readonly announcedMessages = new Set<string>();
  /** The last todo list sent per session, so an unchanged list is not resent. */
  private readonly sentTodos = new Map<string, string>();
  private eventCounter = 0;

  /** Translates one frame; frames with nothing to report yield an empty list. */
  translate(frame: ReasonixEvent): Event[] {
    if (!frame || typeof frame.kind !== "string") {
      return [];
    }

    const events = this.translateFrame(frame);
    if (events.length === 0 && !SILENT_KINDS.has(frame.kind)) {
      logger.debug(`[ReasonixEvents] No SDK event for frame kind=${frame.kind}`);
    }
    return events;
  }

  private translateFrame(frame: ReasonixEvent): Event[] {
    switch (frame.kind) {
      case "runtime_state":
        return this.onRuntimeState(frame);
      case "create":
      case "session_changed":
        return this.onCreate(frame);
      case "user_message":
        return this.onUserMessage(frame);
      case "stream_attempt":
        return this.onStreamAttempt(frame);
      case "reasoning":
        return this.onStreamText(frame, "reasoning");
      case "text":
        return this.onStreamText(frame, "text");
      case "message":
        return this.onMessageSnapshot(frame);
      case "tool_dispatch":
      case "tool_started":
      case "tool_progress":
      case "tool_result":
        return this.onToolFrame(frame);
      case "approval_request":
        return this.onApprovalRequest(frame);
      case "ask_request":
        return this.onAskRequest(frame);
      case "turn_done":
        return this.onTurnDone(frame);
      case "notice":
        return this.onNotice(frame);
      default:
        return [];
    }
  }

  /**
   * A turn's running state is what the bot shows as busy/idle, so the edges of
   * the `running` flag become the session status events.
   */
  private onRuntimeState(frame: ReasonixEvent): Event[] {
    const state = frame.runtimeState;
    const sessionId = frame.sessionId ?? state?.sessionId;
    if (!sessionId || !state) {
      return [];
    }

    const wasRunning = this.runningBySession.get(sessionId) ?? false;
    this.runningBySession.set(sessionId, state.running === true);

    if (state.running !== true && wasRunning) {
      this.announcedMessages.delete(sessionId);
      return [
        this.event("session.idle", sessionId, { sessionID: sessionId }),
        ...this.todoEvents(frame, sessionId),
      ];
    }

    if (state.running === true && !wasRunning) {
      return [
        this.event("session.status", sessionId, {
          sessionID: sessionId,
          status: { type: "busy" },
        }),
        ...this.todoEvents(frame, sessionId),
      ];
    }

    // Busy already: only a todo change is worth sending.
    return this.todoEvents(frame, sessionId);
  }

  /**
   * Reasonix repeats the whole runtime state on every frame of a turn, so the
   * todo list is only forwarded when it actually changed.
   */
  private todoEvents(frame: ReasonixEvent, sessionId: string): Event[] {
    const todos = frame.runtimeState?.todos;
    if (!Array.isArray(todos)) {
      return [];
    }
    const mapped = toTodos(todos);
    const fingerprint = JSON.stringify(mapped);
    if (this.sentTodos.get(sessionId) === fingerprint) {
      return [];
    }
    this.sentTodos.set(sessionId, fingerprint);
    return [this.event("todo.updated", sessionId, { sessionID: sessionId, todos: mapped })];
  }

  /**
   * A session Reasonix had not reported before is one the bot can switch to.
   * `POST /new` announces it as `session_changed` without a path, because the
   * session lives in the instance's own workspace.
   */
  private onCreate(frame: ReasonixEvent): Event[] {
    const sessionId = frame.sessionId;
    if (!sessionId) {
      return [];
    }
    const directory = typeof frame.sessionPath === "string" ? frame.sessionPath : this.root;
    const info = {
      id: sessionId,
      slug: sessionId,
      projectID: directory,
      directory,
      version: "reasonix",
      title: sessionId.slice(0, 8),
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      time: { created: Date.now(), updated: Date.now() },
    };
    return [
      this.event("session.created", sessionId, { info }),
      this.event("session.updated", sessionId, { info }),
    ];
  }

  private onUserMessage(frame: ReasonixEvent): Event[] {
    const sessionId = frame.sessionId;
    const messageId = frame.messageId;
    if (!sessionId || !messageId) {
      return [];
    }
    return [
      this.event("message.updated", sessionId, {
        info: {
          id: messageId,
          sessionID: sessionId,
          role: "user",
          time: { created: Date.now() },
          agent: "",
          model: { providerID: "", modelID: "" },
        },
      }),
    ];
  }

  /**
   * `begin` opens the assistant message the following deltas belong to. Without
   * it the aggregator has no message to attach text to.
   */
  private onStreamAttempt(frame: ReasonixEvent): Event[] {
    const sessionId = frame.sessionId;
    const messageId = frame.messageId;
    const action = frame.streamAttempt?.action;
    if (!sessionId || !messageId || action !== "begin") {
      return [];
    }

    this.announcedMessages.add(messageId);
    return [
      this.event("message.updated", sessionId, {
        info: {
          id: messageId,
          sessionID: sessionId,
          role: "assistant",
          parentID: "",
          modelID: "",
          providerID: "",
          mode: "",
          agent: "",
          path: { cwd: "", root: "" },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: Date.now() },
        },
      }),
    ];
  }

  private onStreamText(frame: ReasonixEvent, type: "text" | "reasoning"): Event[] {
    const sessionId = frame.sessionId;
    const messageId = frame.messageId;
    const delta = typeof frame.text === "string" ? frame.text : "";
    if (!sessionId || !messageId || delta.length === 0) {
      return [];
    }

    // A desktop-started turn can stream without the bot having seen the begin.
    const events: Event[] = [];
    if (!this.announcedMessages.has(messageId)) {
      this.announcedMessages.add(messageId);
      events.push(...this.onStreamAttempt({ ...frame, streamAttempt: { action: "begin" } }));
    }

    const partId = `prt_${messageId}_${type}`;
    events.push(
      this.event("message.part.delta", sessionId, {
        part: {
          id: partId,
          sessionID: sessionId,
          messageID: messageId,
          type,
          text: delta,
        },
        sessionID: sessionId,
        messageID: messageId,
        partID: partId,
        type,
        delta,
      }),
    );
    return events;
  }

  /**
   * The final snapshot replaces the streamed deltas, and completing the message
   * is what tells the bot the turn's output is final.
   */
  private onMessageSnapshot(frame: ReasonixEvent): Event[] {
    const sessionId = frame.sessionId;
    const messageId = frame.messageId;
    if (!sessionId || !messageId) {
      return [];
    }

    const events: Event[] = [];
    if (!this.announcedMessages.has(messageId)) {
      this.announcedMessages.add(messageId);
      events.push(...this.onStreamAttempt({ ...frame, streamAttempt: { action: "begin" } }));
    }

    const textPartId = `prt_${messageId}_text`;
    const reasoningPartId = `prt_${messageId}_reasoning`;
    const now = Date.now();

    if (typeof frame.text === "string" && frame.text.length > 0) {
      events.push(
        this.event("message.part.updated", sessionId, {
          part: {
            id: textPartId,
            sessionID: sessionId,
            messageID: messageId,
            type: "text",
            text: frame.text,
          },
        }),
      );
    }

    if (typeof frame.reasoning === "string" && frame.reasoning.length > 0) {
      events.push(
        this.event("message.part.updated", sessionId, {
          part: {
            id: reasoningPartId,
            sessionID: sessionId,
            messageID: messageId,
            type: "reasoning",
            text: frame.reasoning,
            time: { start: now, end: now },
          },
        }),
      );
    }

    events.push(
      this.event("message.updated", sessionId, {
        info: {
          id: messageId,
          sessionID: sessionId,
          role: "assistant",
          parentID: "",
          modelID: "",
          providerID: "",
          mode: "",
          agent: "",
          path: { cwd: "", root: "" },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: now, completed: now },
        },
      }),
    );

    return events;
  }

  /**
   * Tool frames are partial by design: `tool_progress` repeats the output while
   * the call runs, so the last known name and input are kept to fill in frames
   * that omit them.
   */
  private onToolFrame(frame: ReasonixEvent): Event[] {
    const sessionId = frame.sessionId;
    const messageId = frame.messageId;
    const tool: ReasonixTool | undefined = frame.tool;
    if (!sessionId || !messageId || !tool) {
      return [];
    }

    const callId = tool.id ?? "";
    const known = this.toolByCallId.get(callId) ?? { name: "", input: {} };
    if (tool.name || tool.resolvedName) {
      known.name = tool.resolvedName || tool.name || known.name;
    }
    if (tool.args) {
      try {
        known.input = JSON.parse(tool.args) as Record<string, unknown>;
      } catch {
        known.input = { command: tool.args };
      }
    }
    this.toolByCallId.set(callId, known);

    if (frame.kind === "tool_result") {
      this.toolByCallId.delete(callId);
    }

    const part = toToolPart(sessionId, messageId, tool, frame.kind ?? "", known.name, known.input);
    // `tool_progress` arrives before the final dispatch that names the call, so
    // the derived title is what keeps the running row readable.
    if (part.state.status === "running" && !known.name) {
      part.state.title = toolTitle("", known.input);
    }

    return [this.event("message.part.updated", sessionId, { part })];
  }

  private onApprovalRequest(frame: ReasonixEvent): Event[] {
    const sessionId = frame.sessionId;
    const approval = frame.approval;
    if (!sessionId || !approval?.id) {
      return [];
    }
    return [
      this.event("permission.asked", sessionId, {
        ...toPermission(sessionId, approval),
      }),
    ];
  }

  private onAskRequest(frame: ReasonixEvent): Event[] {
    const sessionId = frame.sessionId;
    const ask = frame.ask;
    if (!sessionId || !ask?.id) {
      return [];
    }
    const request = toQuestion(sessionId, ask);
    return [this.event("question.asked", sessionId, request)];
  }

  /** A turn that did not complete is an error the user has to see. */
  private onTurnDone(frame: ReasonixEvent): Event[] {
    const sessionId = frame.sessionId;
    if (!sessionId || frame.status === "completed") {
      return [];
    }
    const message =
      typeof frame.text === "string" && frame.text.length > 0
        ? frame.text
        : `Turn ${frame.status ?? "failed"}`;
    return [this.event("session.error", sessionId, { sessionID: sessionId, error: message })];
  }

  private onNotice(frame: ReasonixEvent): Event[] {
    const sessionId = frame.sessionId;
    const message = typeof frame.text === "string" ? frame.text : "";
    if (!sessionId || message.length === 0 || frame.level !== "error") {
      return [];
    }
    return [this.event("session.error", sessionId, { sessionID: sessionId, error: message })];
  }

  private event(type: string, sessionId: string, properties: unknown): Event {
    this.eventCounter += 1;
    return {
      id: `rx_${sessionId}_${this.eventCounter}`,
      type,
      properties,
    } as Event;
  }
}

/** Frames that carry no SDK event by design, so they are not worth a debug line. */
const SILENT_KINDS = new Set([
  "turn_status",
  "turn_phase",
  "usage",
  "shell",
  "prompt_answered",
  "approval",
  "ask",
  "todo",
  "checkpoint",
]);
