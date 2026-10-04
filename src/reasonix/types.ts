/**
 * The wire shapes of the Reasonix `serve` HTTP+SSE API, as observed against
 * reasonix v1.39.7.
 *
 * Every type here mirrors a real response body. Fields the server sends but the
 * bot never reads are omitted; fields the bot needs but cannot rely on being
 * present are optional. Reasonix sends camelCase on the wire and snake_case in
 * the SSE frame `kind` values, which is why the two disagree below.
 */

/** `POST /submit` answers 202; the turn's output arrives on the event stream. */
export interface ReasonixSubmitResponse {
  submissionId: string;
}

/** One entry of `GET /sessions`. Identity sessions carry no `path`. */
export interface ReasonixSessionRow {
  hostId?: string;
  sessionId?: string;
  name?: string;
  path?: string;
  title?: string;
  current?: boolean;
  running?: boolean;
  takenOver?: boolean;
  mtimeMilli?: number;
  preview?: string;
  metadataReady?: boolean;
}

/** `GET /runtime-states` -> `sessions[].state`. */
export interface ReasonixRuntimeState {
  schemaVersion?: number;
  hostId?: string;
  sessionId?: string;
  sessionPath?: string;
  projectionEpoch?: string;
  runtimeEpoch?: string;
  revision?: number;
  phase?: string;
  running?: boolean;
  turnId?: string;
  turnStatus?: string;
  activity?: string;
  pendingPrompt?: boolean;
  pendingInteractions?: ReasonixPendingInteraction[];
  todos?: ReasonixTodo[];
  backgroundJobs?: number;
  cancelRequested?: boolean;
  cancellable?: boolean;
}

export interface ReasonixPendingInteraction {
  requestId?: string;
  toolCallId?: string;
  kind?: string;
  turnId?: string;
}

export interface ReasonixTodo {
  id?: string;
  content?: string;
  status?: string;
  priority?: string;
}

export interface ReasonixRuntimeStatesResponse {
  schemaVersion?: number;
  epoch?: string;
  revision?: number;
  sessions?: Array<{
    sessionPath?: string;
    current?: boolean;
    state?: ReasonixRuntimeState;
  }>;
}

/** One entry of `GET /history`. */
export interface ReasonixHistoryMessage {
  messageId?: string;
  role?: "system" | "user" | "assistant" | "tool" | string;
  content?: string;
  reasoning?: string;
  toolCalls?: Array<{ id?: string; name?: string; arguments?: string }>;
  toolCallId?: string;
  toolName?: string;
}

/** The tool payload carried by every `tool_*` and `approval_*` frame. */
export interface ReasonixTool {
  id?: string;
  name?: string;
  args?: string;
  resolvedName?: string;
  output?: string;
  err?: string;
  truncated?: boolean;
  readOnly?: boolean;
  todos?: ReasonixTodo[];
  durationMs?: number;
  startedAt?: number;
  endedAt?: number;
  runState?: string;
  partial?: boolean;
  refreshed?: boolean;
  attemptId?: string;
  execution?: {
    kind?: string;
    shell?: string;
    platform?: string;
    state?: string;
    exitCode?: number;
    mutationRisk?: string;
    verification?: string;
    durationMs?: number;
    [key: string]: unknown;
  };
}

/** The approval payload of an `approval_request` frame. */
export interface ReasonixApproval {
  id: string;
  tool?: string;
  subject?: string;
  turnId?: string;
  generation?: number;
  permissionRevision?: number;
}

export interface ReasonixAskOption {
  label?: string;
  description?: string;
}

export interface ReasonixAskQuestion {
  id?: string;
  header?: string;
  prompt?: string;
  options?: ReasonixAskOption[];
  multi?: boolean;
}

export interface ReasonixAsk {
  id: string;
  questions?: ReasonixAskQuestion[];
  turnId?: string;
}

export interface ReasonixUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cacheHitTokens?: number;
  cacheMissTokens?: number;
  reasoningTokens?: number;
  source?: string;
}

/**
 * One `data:` frame of `GET /events`. `kind` is the wire name; the set is
 * documented in Reasonix's `internal/event` package.
 */
export interface ReasonixEvent {
  kind?: string;
  sessionId?: string;
  sessionPath?: string;
  submissionId?: string;
  turnId?: string;
  promptId?: string;
  promptKind?: string;
  itemId?: string;
  messageId?: string;
  attemptId?: string;
  seq?: number;
  status?: string;
  text?: string;
  phase?: string;
  checkpointTurn?: number;
  tool?: ReasonixTool;
  approval?: ReasonixApproval;
  ask?: ReasonixAsk;
  usage?: ReasonixUsage;
  todos?: ReasonixTodo[];
  streamAttempt?: { id?: string; action?: string; attempt?: number; max?: number };
  level?: string;
  runtimeState?: ReasonixRuntimeState;
  sessionCurrent?: boolean;
  [key: string]: unknown;
}

/** One entry of `GET /pending-prompts`; the same shapes as the live frames. */
export type ReasonixPendingPrompt = ReasonixEvent;

/** `GET /models`. Note Reasonix can list the same model under several providers. */
export interface ReasonixModelsResponse {
  current?: string;
  default?: string;
  label?: string;
  models?: Array<{
    ref?: string;
    provider?: string;
    model?: string;
    kind?: string;
    active?: boolean;
    default?: boolean;
  }>;
}

export interface ReasonixModelSettingsStatus {
  [key: string]: unknown;
}

/** One entry of `GET /commands`. */
export interface ReasonixCommand {
  name?: string;
  description?: string;
  kind?: string;
  group?: string;
  /** True when the command starts a subagent rather than answering inline. */
  subagent?: boolean;
}

/** `GET /permission`. `revision` is the optimistic-concurrency token. */
export interface ReasonixPermissionSnapshot {
  sessionId?: string;
  generation?: number;
  revision?: number;
  preset?: string;
  workspaceRoot?: string;
  grants?: unknown[];
  capabilities?: {
    backend?: string;
    enforcement?: string;
    supportedPresets?: string[];
    writeIsolation?: string;
    readIsolation?: string;
    networkIsolation?: string;
  };
}

/** One entry of `GET /skills`. */
export interface ReasonixSkill {
  name?: string;
  scope?: string;
  subagent?: boolean;
  description?: string;
}

/** `GET /todos`. */
export type ReasonixTodos = ReasonixTodo[];

/** `reasonix session list --json` as the CLI prints it. */
export interface ReasonixCliSessionList {
  schema_version?: number;
  command?: string;
  sessions?: Array<{
    id: string;
    created_at?: string;
    updated_at?: string;
    scope?: string;
    turns?: number;
    state?: string;
    recovered?: boolean;
  }>;
}

/** The item `POST /inbox/items` reports a queued prompt under. */
export interface ReasonixInboxItem {
  itemId?: string;
  disposition?: "queued_followup" | string;
  position?: number;
  paused?: boolean;
}

/** `GET /inbox`: the follow-up queue of the session the runtime is on. */
export interface ReasonixInboxState {
  schemaVersion?: number;
  revision?: number;
  paused?: boolean;
  sessionPath?: string;
  items?: Array<{
    id?: string;
    sessionId?: string;
    intent?: "followup" | string;
    state?: "queued" | "running" | string;
    preview?: string;
    createdAt?: string;
  }> | null;
  capacity?: { items?: number; maxItems?: number };
}
