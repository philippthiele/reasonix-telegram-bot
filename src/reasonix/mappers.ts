import type {
  Command,
  Message,
  Model,
  Part,
  PermissionRequest,
  Provider,
  QuestionRequest,
  Session,
  TextPart,
  ToolPart,
  ToolState,
  Todo,
} from "@opencode-ai/sdk/v2";
import type {
  ReasonixApproval,
  ReasonixAsk,
  ReasonixCommand,
  ReasonixHistoryMessage,
  ReasonixSessionRow,
  ReasonixTodo,
  ReasonixTool,
  ReasonixUsage,
} from "./types.js";

/**
 * Why the adapter cannot hand the SDK a fully populated value: it fills what the
 * bot reads and zeroes what only the server sets.
 */
type JsonRecord = Record<string, unknown>;

export const ZERO_COST = 0;
export const EMPTY_TOKENS = {
  input: 0,
  output: 0,
  reasoning: 0,
  cache: { read: 0, write: 0 },
};

function parseArgs(raw: string | undefined): JsonRecord {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : { value: parsed };
  } catch {
    // Shell tools take their command as a bare string rather than an object.
    return { command: raw };
  }
}

/** The first string field of an input, for tools that carry their subject in one. */
function firstString(input: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * A one-line label for the tool row in Telegram. Reasonix sends no display
 * title, so it is derived from the tool name and its input.
 */
export function toolTitle(tool: string, input: JsonRecord): string {
  switch (tool) {
    case "bash":
      return firstString(input, ["command", "script"]) ?? "shell";
    case "read":
      return firstString(input, ["path", "filePath", "file"]) ?? "file";
    case "write":
      return firstString(input, ["path", "filePath", "file"]) ?? "file";
    case "edit":
    case "apply_patch":
      return firstString(input, ["path", "filePath", "file"]) ?? "file";
    case "grep":
      return firstString(input, ["pattern", "query"]) ?? "search";
    case "glob":
      return firstString(input, ["pattern"]) ?? "files";
    case "task":
      return firstString(input, ["description", "subagent_type", "agent"]) ?? "task";
    case "webfetch":
      return firstString(input, ["url"]) ?? "web";
    case "skill":
      return firstString(input, ["name", "skill"]) ?? "skill";
    case "todowrite":
      return "todo list";
    case "todoread":
      return "todo list";
    default:
      return tool || "tool";
  }
}

/** Reasonix tool names arrive as the model wrote them; the formatters expect lowercase. */
function normalizeToolName(name: string): string {
  return name.trim().toLowerCase();
}

export function toTodos(rows: ReasonixTodo[] | undefined): Todo[] {
  return (rows ?? [])
    .filter((row): row is ReasonixTodo & { content: string } => typeof row.content === "string")
    .map((row) => ({
      content: row.content,
      status: row.status ?? "pending",
      priority: row.priority ?? "medium",
    }));
}

/**
 * A session of a serve instance. A file-backed session lists its transcript
 * path; one held in memory has none, and then the instance's own root is the
 * directory it works in.
 */
export function toSession(row: ReasonixSessionRow, root: string): Session {
  const id = row.sessionId ?? row.path?.split("/").pop() ?? "";
  const updated = row.mtimeMilli ?? Date.now();
  const directory = root;
  return {
    id,
    slug: id,
    projectID: directory,
    directory,
    version: "reasonix",
    title: row.title ?? row.name ?? row.preview ?? id.slice(0, 8),
    cost: ZERO_COST,
    tokens: EMPTY_TOKENS,
    time: { created: updated, updated },
  };
}

export function toMessages(sessionId: string, history: ReasonixHistoryMessage[]): Message[] {
  const messages: Message[] = [];
  let created = Date.now();

  for (const entry of history) {
    created += 1;
    const id = entry.messageId ?? `rx-${created}`;
    const role = entry.role;

    if (role === "user" || role === "system") {
      messages.push({
        id,
        sessionID: sessionId,
        role: "user",
        time: { created },
        agent: "",
        model: { providerID: "", modelID: "" },
      });
      continue;
    }

    if (role !== "assistant") {
      continue;
    }

    messages.push({
      id,
      sessionID: sessionId,
      role: "assistant",
      parentID: "",
      modelID: "",
      providerID: "",
      mode: "",
      agent: "",
      path: { cwd: "", root: "" },
      cost: ZERO_COST,
      tokens: EMPTY_TOKENS,
      time: { created, completed: created },
    });
  }

  return messages;
}

/** The history endpoint returns text only, so text parts carry the content. */
export function toHistoryParts(sessionId: string, history: ReasonixHistoryMessage[]): Part[] {
  const parts: Part[] = [];
  let index = 0;

  for (const entry of history) {
    index += 1;
    if (entry.role !== "assistant" && entry.role !== "user" && entry.role !== "system") {
      continue;
    }
    if (typeof entry.content !== "string" || entry.content.length === 0) {
      continue;
    }
    const messageId = entry.messageId ?? `rx-${index}`;
    parts.push({
      id: `${messageId}-text`,
      sessionID: sessionId,
      messageID: messageId,
      type: "text",
      text: entry.content,
    } satisfies TextPart);
  }

  return parts;
}

export function toModel(ref: string, name: string): Model {
  const [providerID = ref, ...rest] = ref.split("/");
  const id = rest.join("/") || ref;
  return {
    id,
    providerID,
    name,
    api: { id: ref, url: "", npm: "" },
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 0, output: 0 },
    status: "active",
    options: {},
    headers: {},
    release_date: "",
    capabilities: {
      temperature: false,
      reasoning: false,
      attachment: false,
      toolcall: true,
      input: { text: true, audio: false, image: false, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: false,
    },
  };
}

export function toProvider(id: string, models: Model[]): Provider {
  const byId: Record<string, Model> = {};
  for (const model of models) {
    if (model.providerID === id && !byId[model.id]) {
      byId[model.id] = model;
    }
  }
  return { id, name: id, source: "config", env: [], models: byId, options: {} };
}

export function toCommand(row: ReasonixCommand): Command {
  const name = row.name ?? "";
  return {
    name,
    description: row.description ?? "",
    template: `/${name}`,
    source: "command",
    hints: [],
    ...(row.subagent ? { subtask: true } : {}),
  };
}

/**
 * Reasonix grants are per turn: `/approve` has no persist option, so the
 * prompt offers only "allow once".
 */
export function toPermission(sessionId: string, approval: ReasonixApproval): PermissionRequest {
  const patterns = approval.subject ? [approval.subject] : [];
  return {
    id: approval.id,
    sessionID: sessionId,
    permission: approval.tool ?? "unknown",
    patterns,
    metadata: {
      turnId: approval.turnId ?? "",
      generation: approval.generation ?? 0,
      permissionRevision: approval.permissionRevision ?? 0,
    },
    always: [],
  };
}

export function toQuestion(sessionId: string, ask: ReasonixAsk): QuestionRequest {
  const questions = (ask.questions ?? []).map((question) => ({
    question: question.prompt ?? question.header ?? "",
    header: question.header ?? question.prompt ?? "",
    options: (question.options ?? []).map((option) => ({
      label: option.label ?? "",
      description: option.description ?? "",
    })),
    multiple: question.multi === true,
    // Reasonix accepts only the offered options.
    custom: false,
  }));

  return {
    id: ask.id,
    sessionID: sessionId,
    questions:
      questions.length > 0 ? questions : [{ question: "", header: "", options: [], custom: false }],
  };
}

export function toUsage(usage: ReasonixUsage): {
  input: number;
  output: number;
  reasoning: number;
  cache: { read: number; write: number };
} {
  return {
    input: usage.promptTokens ?? 0,
    output: usage.completionTokens ?? 0,
    reasoning: usage.reasoningTokens ?? 0,
    cache: { read: usage.cacheHitTokens ?? 0, write: 0 },
  };
}

/** The tool state a `tool_*` frame implies, given what earlier frames knew. */
export function toToolState(
  tool: ReasonixTool,
  kind: string,
  knownName: string,
  knownInput: JsonRecord,
): ToolState {
  const name = normalizeToolName(tool.resolvedName || tool.name || knownName);
  const input = tool.args ? parseArgs(tool.args) : knownInput;
  const title = toolTitle(name, input);
  const output = tool.err ?? tool.output ?? "";
  const start = tool.startedAt ?? Date.now();
  const end = tool.endedAt ?? start;
  const metadata = tool.execution
    ? ({ execution: tool.execution, readOnly: tool.readOnly ?? false } satisfies JsonRecord)
    : ({ readOnly: tool.readOnly ?? false } satisfies JsonRecord);

  if (kind === "tool_result") {
    if (tool.err || tool.runState === "failed" || tool.runState === "error") {
      return {
        status: "error",
        input,
        error: tool.err || "tool failed",
        metadata,
        time: { start, end },
      };
    }
    return {
      status: "completed",
      input,
      output,
      title,
      metadata,
      time: { start, end },
    };
  }

  if (kind === "tool_progress" || kind === "tool_started") {
    return {
      status: "running",
      input,
      title,
      metadata,
      time: { start },
    };
  }

  return { status: "pending", input, raw: tool.args ?? "" };
}

export function toToolPart(
  sessionId: string,
  messageId: string,
  tool: ReasonixTool,
  kind: string,
  knownName: string,
  knownInput: JsonRecord,
): ToolPart {
  const name = normalizeToolName(tool.resolvedName || tool.name || knownName);
  return {
    id: `prt_${tool.id ?? `${messageId}-${kind}`}`,
    sessionID: sessionId,
    messageID: messageId,
    type: "tool",
    callID: tool.id ?? "",
    tool: name,
    state: toToolState(tool, kind, knownName, knownInput),
  };
}
