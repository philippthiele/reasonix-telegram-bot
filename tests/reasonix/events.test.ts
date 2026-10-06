import { describe, expect, it } from "vitest";
import type { Event } from "@opencode-ai/sdk/v2";
import { ReasonixEventTranslator } from "../../src/reasonix/events.js";
import { defined } from "../helpers/defined.js";
import type { ReasonixEvent } from "../../src/reasonix/types.js";

const SESSION = "e645f97f6095d3daf8a04aaf108eca8b";
const MESSAGE = "01M440HRKM80MJC0NPGHE1X5D0";

function runtimeState(running: boolean, extras: Record<string, unknown> = {}): ReasonixEvent {
  return {
    kind: "runtime_state",
    sessionId: SESSION,
    runtimeState: {
      sessionId: SESSION,
      running,
      phase: running ? "executing" : "idle",
      ...extras,
    },
  };
}

function typesOf(events: Event[]): string[] {
  return events.map((event) => (event as { type: string }).type);
}

describe("ReasonixEventTranslator", () => {
  it("reports a turn as busy once and idle once", () => {
    const translator = new ReasonixEventTranslator();

    const started = translator.translate(runtimeState(true));
    expect(typesOf(started)).toEqual(["session.status"]);
    expect((defined(started[0]).properties as { status: { type: string } }).status.type).toBe("busy");

    // Reasonix repeats the running state on every frame of a turn.
    expect(translator.translate(runtimeState(true))).toEqual([]);
    expect(translator.translate(runtimeState(true))).toEqual([]);

    const ended = translator.translate(runtimeState(false));
    expect(typesOf(ended)).toEqual(["session.idle"]);

    // A late state frame must not report a second end of turn.
    expect(translator.translate(runtimeState(false))).toEqual([]);
  });

  it("announces the assistant message before streaming its text", () => {
    const translator = new ReasonixEventTranslator();

    const begin = translator.translate({
      kind: "stream_attempt",
      sessionId: SESSION,
      messageId: MESSAGE,
      streamAttempt: { action: "begin", attempt: 1, max: 4 },
    });
    expect(typesOf(begin)).toEqual(["message.updated"]);

    const delta = translator.translate({
      kind: "text",
      sessionId: SESSION,
      messageId: MESSAGE,
      text: "ok",
    });
    expect(typesOf(delta)).toEqual(["message.part.delta"]);
    const properties = defined(delta[0]).properties as {
      part: { type: string; text: string };
      delta: string;
    };
    expect(properties.part.type).toBe("text");
    expect(properties.part.text).toBe("ok");
    expect(properties.delta).toBe("ok");
  });

  it("announces the message itself when text arrives without a begin frame", () => {
    const translator = new ReasonixEventTranslator();

    const events = translator.translate({
      kind: "reasoning",
      sessionId: SESSION,
      messageId: MESSAGE,
      text: "thinking",
    });

    expect(typesOf(events)).toEqual(["message.updated", "message.part.delta"]);
    const delta = defined(events[1]).properties as { part: { type: string } };
    expect(delta.part.type).toBe("reasoning");
  });

  it("replaces streamed deltas with the final snapshot and completes the message", () => {
    const translator = new ReasonixEventTranslator();

    const events = translator.translate({
      kind: "message",
      sessionId: SESSION,
      messageId: MESSAGE,
      text: "all of it",
      reasoning: "because",
    });

    expect(typesOf(events)).toEqual([
      "message.updated",
      "message.part.updated",
      "message.part.updated",
      "message.updated",
    ]);

    const textPart = defined(events[1]).properties as { part: { type: string; text: string } };
    expect(textPart.part).toMatchObject({ type: "text", text: "all of it" });

    const reasoningPart = defined(events[2]).properties as { part: { type: string; text: string } };
    expect(reasoningPart.part).toMatchObject({ type: "reasoning", text: "because" });

    const completed = defined(events[3]).properties as {
      info: { role: string; time: { completed?: number } };
    };
    expect(completed.info.role).toBe("assistant");
    expect(completed.info.time.completed).toBeTypeOf("number");
  });

  it("keeps the tool name from the dispatch when a progress frame omits it", () => {
    const translator = new ReasonixEventTranslator();
    const callId = "call_00_TL0LWLxshFPH86Q6xYcV6752";

    translator.translate({
      kind: "tool_dispatch",
      sessionId: SESSION,
      messageId: MESSAGE,
      tool: { id: callId, name: "bash", args: '{"command": "ls"}', runState: "pending" },
    });

    const progress = translator.translate({
      kind: "tool_progress",
      sessionId: SESSION,
      messageId: MESSAGE,
      tool: { id: callId, name: "", output: "a.txt\n" },
    });
    const running = defined(progress[0]).properties as {
      part: { tool: string; state: { status: string; title?: string } };
    };
    expect(running.part.tool).toBe("bash");
    expect(running.part.state.status).toBe("running");

    const done = translator.translate({
      kind: "tool_result",
      sessionId: SESSION,
      messageId: MESSAGE,
      tool: { id: callId, name: "bash", output: "a.txt\n", runState: "completed", durationMs: 252 },
    });
    const completed = defined(done[0]).properties as {
      part: {
        callID: string;
        state: { status: string; output: string; input: { command: string } };
      };
    };
    expect(completed.part.callID).toBe(callId);
    expect(completed.part.state.status).toBe("completed");
    expect(completed.part.state.output).toBe("a.txt\n");
    expect(completed.part.state.input.command).toBe("ls");
  });

  it("maps a tool error to an error state", () => {
    const translator = new ReasonixEventTranslator();

    const events = translator.translate({
      kind: "tool_result",
      sessionId: SESSION,
      messageId: MESSAGE,
      tool: { id: "call_1", name: "bash", args: '{"command": "false"}', err: "exit status 1" },
    });

    const state = (defined(events[0]).properties as { part: { state: { status: string; error: string } } })
      .part.state;
    expect(state.status).toBe("error");
    expect(state.error).toBe("exit status 1");
  });

  it("offers an approval without an always-grant option", () => {
    const translator = new ReasonixEventTranslator();

    const events = translator.translate({
      kind: "approval_request",
      sessionId: SESSION,
      approval: {
        id: "1",
        tool: "bash",
        subject: "ls",
        turnId: "turn_1",
        generation: 1,
        permissionRevision: 4,
      },
    });

    expect(typesOf(events)).toEqual(["permission.asked"]);
    const properties = defined(events[0]).properties as unknown as {
      id: string;
      sessionID: string;
      permission: string;
      patterns: string[];
      always: string[];
    };
    expect(properties.id).toBe("1");
    expect(properties.sessionID).toBe(SESSION);
    expect(properties.permission).toBe("bash");
    expect(properties.patterns).toEqual(["ls"]);
    expect(properties.always).toEqual([]);
  });

  it("maps an ask to a question request with its options", () => {
    const translator = new ReasonixEventTranslator();

    const events = translator.translate({
      kind: "ask_request",
      sessionId: SESSION,
      ask: {
        id: "2",
        questions: [
          {
            id: "q1",
            header: "Drink",
            prompt: "Tea or coffee?",
            options: [
              { label: "Tea", description: "Hot" },
              { label: "Coffee", description: "Dark" },
            ],
          },
        ],
      },
    });

    expect(typesOf(events)).toEqual(["question.asked"]);
    const properties = defined(events[0]).properties as unknown as {
      id: string;
      questions: Array<{
        question: string;
        header: string;
        options: Array<{ label: string }>;
        custom: boolean;
      }>;
    };
    expect(properties.id).toBe("2");
    const question = defined(properties.questions[0]);
    expect(question).toMatchObject({
      question: "Tea or coffee?",
      header: "Drink",
      custom: false,
    });
    expect(question.options.map((option) => option.label)).toEqual(["Tea", "Coffee"]);
  });

  it("reports a turn that did not complete as a session error", () => {
    const translator = new ReasonixEventTranslator();

    expect(
      translator.translate({ kind: "turn_done", sessionId: SESSION, status: "completed" }),
    ).toEqual([]);

    const failed = translator.translate({
      kind: "turn_done",
      sessionId: SESSION,
      status: "failed",
    });
    expect(typesOf(failed)).toEqual(["session.error"]);
  });

  it("forwards a session it had not seen before", () => {
    const translator = new ReasonixEventTranslator();

    const events = translator.translate({
      kind: "create",
      sessionId: "new-session",
      sessionPath: "/home/dev/project",
    });

    expect(typesOf(events)).toEqual(["session.created", "session.updated"]);
    const created = defined(events[0]).properties as { info: { id: string; directory: string } };
    expect(created.info).toMatchObject({ id: "new-session", directory: "/home/dev/project" });
  });

  it("forwards a session the instance created in its own workspace", () => {
    // `POST /new` announces the session without a path, because it is in memory.
    const translator = new ReasonixEventTranslator("/tmp/proj");

    const events = translator.translate({
      kind: "session_changed",
      sessionId: "new-session",
      sessionReset: true,
    });

    expect(typesOf(events)).toEqual(["session.created", "session.updated"]);
    const created = defined(events[0]).properties as { info: { directory: string } };
    expect(created.info.directory).toBe("/tmp/proj");
  });

  it("forwards todo changes while a turn runs", () => {
    const translator = new ReasonixEventTranslator();

    const events = translator.translate(
      runtimeState(true, {
        todos: [{ content: "Write tests", status: "in_progress", priority: "high" }],
      }),
    );

    expect(typesOf(events)).toContain("todo.updated");
    const todos = defined(events[events.length - 1]).properties as {
      todos: Array<{ content: string; status: string }>;
    };
    expect(todos.todos).toEqual([
      { content: "Write tests", status: "in_progress", priority: "high" },
    ]);
  });

  it("ignores a frame without a kind", () => {
    expect(new ReasonixEventTranslator().translate({ seq: 1 })).toEqual([]);
  });
});
