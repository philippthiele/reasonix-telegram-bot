import { describe, expect, it } from "vitest";
import {
  toolTitle,
  toCommand,
  toModel,
  toPermission,
  toQuestion,
  toSession,
  toSessionAddress,
  toTodos,
  toToolState,
} from "../../src/reasonix/mappers.js";

describe("toSessionAddress", () => {
  it("addresses a session held in memory by its id", () => {
    // `/sessions` lists an in-memory session with an empty path, but Reasonix
    // still expects `session-id:<id>` on every request that names a session.
    expect(toSessionAddress({ sessionId: "abc123", path: "" })).toEqual({
      id: "abc123",
      path: "session-id:abc123",
    });
  });

  it("keeps the transcript path of a session already on disk", () => {
    expect(
      toSessionAddress({ sessionId: "abc123", path: "/home/dev/p/sessions/abc.jsonl" }),
    ).toEqual({
      id: "abc123",
      path: "/home/dev/p/sessions/abc.jsonl",
    });
  });

  it("reads the id out of the transcript name when there is none", () => {
    expect(
      toSessionAddress({ path: "/home/dev/p/sessions/20260811-132701-session.jsonl" }),
    ).toEqual({
      id: "20260811-132701-session.jsonl",
      path: "/home/dev/p/sessions/20260811-132701-session.jsonl",
    });
  });
});

describe("toSession", () => {
  it("uses the instance root as the session's directory", () => {
    const session = toSession(
      {
        sessionId: "abc123",
        name: "Refactor",
        path: "/home/dev/.reasonix/projects/-tmp-proj/sessions/abc.jsonl",
        mtimeMilli: 1_700_000_000_000,
      },
      "/tmp/proj",
    );

    expect(session).toMatchObject({
      id: "abc123",
      title: "Refactor",
      directory: "/tmp/proj",
      projectID: "/tmp/proj",
    });
    expect(session.time.updated).toBe(1_700_000_000_000);
  });

  it("falls back to the transcript file name for a session listed only by path", () => {
    const session = toSession(
      { path: "/home/dev/p/sessions/20260811-132701-session.jsonl" },
      "/home/dev/p",
    );

    expect(session.id).toBe("20260811-132701-session.jsonl");
    expect(session.directory).toBe("/home/dev/p");
  });

  it("survives a session with neither id nor path", () => {
    const session = toSession({}, "/tmp/proj");

    expect(session.id).toBe("");
    expect(session.directory).toBe("/tmp/proj");
  });
});

describe("toolTitle", () => {
  it("names the subject of the tools the bot renders", () => {
    expect(toolTitle("bash", { command: "npm test" })).toBe("npm test");
    expect(toolTitle("read", { path: "src/index.ts" })).toBe("src/index.ts");
    expect(toolTitle("write", { filePath: "out.txt" })).toBe("out.txt");
    expect(toolTitle("edit", { path: "a.ts" })).toBe("a.ts");
    expect(toolTitle("grep", { pattern: "TODO" })).toBe("TODO");
    expect(toolTitle("webfetch", { url: "https://example.com" })).toBe("https://example.com");
    expect(toolTitle("todowrite", {})).toBe("todo list");
  });

  it("falls back to the tool name when the input carries no subject", () => {
    expect(toolTitle("skill", {})).toBe("skill");
    expect(toolTitle("unknown_tool", {})).toBe("unknown_tool");
    expect(toolTitle("", {})).toBe("tool");
  });
});

describe("toToolState", () => {
  it("parses the JSON argument string into the input", () => {
    const state = toToolState(
      { id: "c1", name: "bash", args: '{"command":"ls"}' },
      "tool_dispatch",
      "",
      {},
    );

    expect(state.status).toBe("pending");
    expect(state).toHaveProperty("input.command", "ls");
  });

  it("keeps a bare command string usable as input", () => {
    const state = toToolState({ id: "c1", name: "bash", args: "ls -la" }, "tool_dispatch", "", {});

    expect(state).toHaveProperty("input.command", "ls -la");
  });

  it("falls back to what an earlier frame knew when a frame omits the input", () => {
    const state = toToolState({ id: "c1", name: "", output: "out" }, "tool_progress", "bash", {
      command: "ls",
    });

    expect(state.status).toBe("running");
    expect(state).toHaveProperty("input.command", "ls");
  });

  it("treats a tool error as an error state", () => {
    const state = toToolState(
      { id: "c1", name: "bash", err: "exit status 2" },
      "tool_result",
      "bash",
      {},
    );

    expect(state.status).toBe("error");
    expect(state).toHaveProperty("error", "exit status 2");
  });

  it("carries the reported timings", () => {
    const state = toToolState(
      { id: "c1", name: "bash", output: "ok", startedAt: 100, endedAt: 350 },
      "tool_result",
      "bash",
      {},
    );

    expect(state).toHaveProperty("time.start", 100);
    expect(state).toHaveProperty("time.end", 350);
  });
});

describe("toPermission", () => {
  it("offers no always-grant option, because Reasonix grants one turn at a time", () => {
    const permission = toPermission("session-1", {
      id: "1",
      tool: "bash",
      subject: "rm -rf build",
      turnId: "turn-1",
      generation: 2,
      permissionRevision: 7,
    });

    expect(permission.always).toEqual([]);
    expect(permission.patterns).toEqual(["rm -rf build"]);
    expect(permission.metadata).toMatchObject({ turnId: "turn-1", permissionRevision: 7 });
  });

  it("handles an approval with no subject", () => {
    expect(toPermission("session-1", { id: "1", tool: "write" }).patterns).toEqual([]);
  });
});

describe("toQuestion", () => {
  it("maps options and refuses custom answers", () => {
    const question = toQuestion("session-1", {
      id: "2",
      questions: [
        {
          id: "q1",
          header: "Pick",
          prompt: "Which one?",
          options: [{ label: "A", description: "first" }],
          multi: true,
        },
      ],
    });

    expect(question.questions[0]).toMatchObject({
      header: "Pick",
      question: "Which one?",
      multiple: true,
      custom: false,
    });
    expect(question.questions[0]?.options).toEqual([{ label: "A", description: "first" }]);
  });

  it("still produces one question when Reasonix sent none", () => {
    expect(toQuestion("session-1", { id: "2" }).questions).toHaveLength(1);
  });
});

describe("toModel", () => {
  it("splits a provider-qualified model reference", () => {
    const model = toModel("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash");

    expect(model.providerID).toBe("deepseek");
    expect(model.id).toBe("deepseek-v4-flash");
    expect(model.name).toBe("DeepSeek V4 Flash");
  });

  it("keeps a bare reference usable", () => {
    const model = toModel("gpt-5", "GPT-5");

    expect(model.providerID).toBe("gpt-5");
    expect(model.id).toBe("gpt-5");
  });
});

describe("toCommand", () => {
  it("builds a slash command from the Reasonix catalogue", () => {
    expect(toCommand({ name: "compact", description: "Compact the session" })).toMatchObject({
      name: "compact",
      description: "Compact the session",
      template: "/compact",
    });
  });

  it("marks a subagent command as one", () => {
    expect(toCommand({ name: "task", subagent: true }).subtask).toBe(true);
  });
});

describe("toTodos", () => {
  it("keeps only the rows that carry content", () => {
    expect(
      toTodos([
        { content: "Write tests", status: "in_progress", priority: "high" },
        { status: "pending" },
      ]),
    ).toEqual([{ content: "Write tests", status: "in_progress", priority: "high" }]);
  });

  it("fills the statuses Reasonix leaves out", () => {
    expect(toTodos([{ content: "Ship it" }])).toEqual([
      { content: "Ship it", status: "pending", priority: "medium" },
    ]);
  });
});
