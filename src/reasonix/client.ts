import type { Event } from "@opencode-ai/sdk/v2";
import { logger } from "../utils/logger.js";
import { getInstance, type ReasonixInstance } from "./instance.js";
import { ReasonixEventTranslator } from "./events.js";
import { ReasonixRequestError, request, streamEvents } from "./http.js";
import {
  toCommand,
  toHistoryParts,
  toMessages,
  toModel,
  toProvider,
  toSession,
  toTodos,
} from "./mappers.js";
import type {
  ReasonixCommand,
  ReasonixHistoryMessage,
  ReasonixModelsResponse,
  ReasonixPermissionSnapshot,
  ReasonixRuntimeStatesResponse,
  ReasonixSessionRow,
} from "./types.js";

export type Result<T> = { data: T; error: undefined } | { data: undefined; error: unknown };

/** A session as Reasonix addresses it: by id while in memory, by transcript path once on disk. */
export interface ReasonixSession {
  id: string;
  path: string;
  title: string;
  workspaceRoot: string;
}

/** What the bot asks Reasonix to confirm, before it is answered. */
export interface AnswerPayload {
  requestId: string;
  answers: Array<{ questionId: string; selected: string[] }>;
  sessionId?: string;
}

/**
 * The Reasonix-backed stand-in for the OpenCode SDK client.
 *
 * Feature code keeps calling the same operations and still reads SDK-shaped
 * values; this class only knows which project root a call belongs to, forwards
 * it to that root's `reasonix serve`, and translates the answer. A call without
 * a directory goes to the root of the session the bot currently works in.
 */
export class ReasonixClient {
  private activeRoot = process.cwd();

  /** The root subsequent calls without a directory go to. */
  setActiveRoot(root: string): void {
    this.activeRoot = root;
  }

  getActiveRoot(): string {
    return this.activeRoot;
  }

  private rootFor(directory?: string): string {
    return directory && directory.length > 0 ? directory : this.activeRoot;
  }

  private async call<T>(
    directory: string | undefined,
    run: (instance: ReasonixInstance) => Promise<T>,
  ): Promise<Result<T>> {
    try {
      const instance = await getInstance(this.rootFor(directory));
      return { data: await run(instance), error: undefined };
    } catch (error) {
      logger.debug(`[ReasonixClient] ${this.rootFor(directory)}: ${errorText(error)}`);
      return { data: undefined, error };
    }
  }

  private get<T>(
    instance: ReasonixInstance,
    endpoint: string,
    query?: Record<string, string> | undefined,
  ): Promise<T | undefined> {
    return request<T>(instance.baseUrl, instance.token, endpoint, { query });
  }

  private post<T>(
    instance: ReasonixInstance,
    endpoint: string,
    body?: unknown,
  ): Promise<T | undefined> {
    return request<T>(instance.baseUrl, instance.token, endpoint, { body: body ?? {} });
  }

  readonly session = {
    list: async (params?: { directory?: string }): Promise<Result<unknown[]>> =>
      this.call(params?.directory, async (instance) => {
        const rows = await this.get<ReasonixSessionRow[]>(instance, "/sessions");
        return (rows ?? []).map((row) => toSession(row, instance.root));
      }),

    get: async (params: { sessionID: string; directory?: string }): Promise<Result<unknown>> =>
      this.call(params.directory, async (instance) => {
        const session = await this.resolve(instance, params.sessionID);
        // Reasonix names a session after its first prompt; until then the
        // transcript file or the short id stands in.
        const info = toSession(
          {
            sessionId: session.id,
            title: session.title,
            path: session.path,
            mtimeMilli: Date.now(),
          },
          session.workspaceRoot,
        );
        return { ...info, title: await this.titleFor(instance, session) };
      }),

    /**
     * Starts a session in this instance's workspace. Reasonix reports the new
     * session as the instance's current one rather than in the answer, so the id
     * is read back from the runtime state.
     */
    create: async (params?: { directory?: string }): Promise<Result<{ id: string }>> =>
      this.call(params?.directory, async (instance) => {
        await this.post(instance, "/new", {});
        const states = await this.get<ReasonixRuntimeStatesResponse>(instance, "/runtime-states");
        const current = (states?.sessions ?? []).find((entry) => entry?.current);
        const id = current?.state?.sessionId ?? current?.sessionPath ?? "";
        if (!id) {
          throw new ReasonixRequestError(
            "Reasonix did not report the new session",
            500,
            "/runtime-states",
          );
        }
        return { id };
      }),

    /**
     * Sends a turn. Reasonix streams the answer, so the only answer here is the
     * submission id the turn is tracked under. A busy session is refused, and
     * the prompt is then queued as a follow-up instead of lost.
     */
    prompt: async (params: {
      path: { id: string };
      parts?: Array<{ type: string; text?: string }>;
      directory?: string;
    }): Promise<Result<{ submissionId: string }>> =>
      this.call(params.directory, async (instance) => {
        const text = (params.parts ?? [])
          .filter((part) => part.type === "text" && typeof part.text === "string")
          .map((part) => part.text)
          .join("\n");

        if (text.trim().length === 0) {
          throw new ReasonixRequestError("Reasonix prompts carry text only", 400, "/submit");
        }

        const session = await this.resolve(instance, params.path.id);
        const submissionId = `tg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        try {
          await this.post(instance, "/submit", { submissionId, input: text, path: session.path });
        } catch (error) {
          if (!(error instanceof ReasonixRequestError) || error.status !== 409) {
            throw error;
          }
          // Reasonix keeps its own follow-up queue for a session that is busy.
          await this.post(instance, "/inbox/items", { input: text, path: session.path });
        }

        return { submissionId };
      }),

    abort: async (params: { path: { id: string }; directory?: string }): Promise<Result<boolean>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.resolve(instance, params.path.id);
        const states = await this.get<ReasonixRuntimeStatesResponse>(instance, "/runtime-states");
        const state = findState(states, session);
        if (!state?.turnId) {
          return false;
        }
        await this.post(instance, "/cancel", { turnId: state.turnId, path: session.path });
        return true;
      }),
  };

  readonly permission = {
    /** Reasonix holds at most one pending approval per session. */
    list: async (params?: { directory?: string }): Promise<Result<unknown[]>> =>
      this.call(params?.directory, async (instance) => {
        const pending = await this.get<
          Array<{ approval?: { id?: string; tool?: string; subject?: string; turnId?: string } }>
        >(instance, "/pending-prompts");
        const rows = (pending ?? [])
          .filter((entry) => entry?.approval?.id)
          .map((entry) => entry.approval as NonNullable<typeof entry.approval>);
        const snapshot = await this.get<ReasonixPermissionSnapshot>(instance, "/permission");
        return rows.map((approval) => ({
          id: approval.id as string,
          sessionID: "",
          permission: approval.tool ?? "unknown",
          patterns: approval.subject ? [approval.subject] : [],
          metadata: {
            turnId: approval.turnId ?? "",
            generation: 0,
            permissionRevision: snapshot?.revision ?? 0,
          },
          // Reasonix grants last one turn, so there is no "always" option.
          always: [],
        }));
      }),

    /**
     * Answers an approval. Reasonix grants per turn only, so `always` and
     * `persist` are answered like a one-off grant.
     */
    reply: async (params: {
      requestID: string;
      response: "once" | "always" | "reject";
      directory?: string;
    }): Promise<Result<boolean>> =>
      this.call(params?.directory, async (instance) => {
        const snapshot = await this.get<ReasonixPermissionSnapshot>(instance, "/permission");
        await this.post(instance, "/approve", {
          id: params.requestID,
          allow: params.response !== "reject",
          permissionRevision: snapshot?.revision ?? 0,
          generation: snapshot?.generation ?? 0,
        });
        return true;
      }),
  };

  readonly question = {
    list: async (params?: { directory?: string }): Promise<Result<unknown[]>> =>
      this.call(params?.directory, async (instance) => {
        const pending = await this.get<Array<{ ask?: { id?: string } }>>(
          instance,
          "/pending-prompts",
        );
        return (pending ?? [])
          .filter((entry) => entry?.ask?.id)
          .map((entry) => ({ id: entry.ask?.id as string, sessionID: "", questions: [] }));
      }),

    reply: async (params: AnswerPayload & { directory?: string }): Promise<Result<boolean>> =>
      this.call(params.directory, async (instance) => {
        await this.post(instance, "/answer", {
          id: params.requestId,
          answers: params.answers.map((answer) => ({
            questionId: answer.questionId,
            selected: answer.selected,
          })),
        });
        return true;
      }),

    reject: async (params: { requestID: string; directory?: string }): Promise<Result<boolean>> =>
      this.call(params?.directory, async (instance) => {
        await this.post(instance, "/answer", { id: params.requestID, answers: [] });
        return true;
      }),
  };

  readonly model = {
    list: async (params?: { directory?: string }): Promise<Result<unknown[]>> =>
      this.call(params?.directory, async (instance) => {
        const response = await this.get<ReasonixModelsResponse>(instance, "/models");
        return dedupeModels(response?.models ?? []).map((entry) =>
          toModel(entry.ref ?? "", entry.model ?? entry.ref ?? ""),
        );
      }),

    providers: async (params?: { directory?: string }): Promise<Result<unknown[]>> =>
      this.call(params?.directory, async (instance) => {
        const response = await this.get<ReasonixModelsResponse>(instance, "/models");
        const models = dedupeModels(response?.models ?? []).map((entry) =>
          toModel(entry.ref ?? "", entry.model ?? entry.ref ?? ""),
        );
        const providerIds = [...new Set(models.map((model) => model.providerID))];
        return providerIds.map((id) => toProvider(id, models));
      }),
  };

  readonly command = {
    list: async (params?: { directory?: string }): Promise<Result<unknown[]>> =>
      this.call(params?.directory, async (instance) => {
        const rows = await this.get<ReasonixCommand[]>(instance, "/commands");
        return (rows ?? []).filter((row) => typeof row?.name === "string").map(toCommand);
      }),
  };

  readonly todo = {
    list: async (params: { sessionID: string; directory?: string }): Promise<Result<unknown[]>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.resolve(instance, params.sessionID);
        const rows = await this.get<unknown[]>(instance, "/todos", { path: session.path });
        return toTodos(rows as Parameters<typeof toTodos>[0]);
      }),
  };

  readonly skill = {
    list: async (params?: { directory?: string }): Promise<Result<unknown[]>> =>
      this.call(params?.directory, async (instance) => {
        const rows = await this.get<
          Array<{ name?: string; description?: string; subagent?: boolean }>
        >(instance, "/skills");
        return (rows ?? [])
          .filter((row) => typeof row?.name === "string")
          .map((row) => ({ name: row.name as string, description: row.description ?? "" }));
      }),
  };

  readonly global = {
    health: async (params?: {
      directory?: string;
    }): Promise<Result<{ healthy: boolean; version?: string }>> =>
      this.call(params?.directory, async (instance) => {
        // Any 200 proves the server is up; `/models` needs no session context.
        await this.get<ReasonixModelsResponse>(instance, "/models");
        return { healthy: true };
      }),
  };

  readonly message = {
    /** The history the bot shows for a session, as messages and text parts. */
    history: async (params: {
      sessionID: string;
      directory?: string;
    }): Promise<Result<{ messages: unknown[]; parts: unknown[] }>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.resolve(instance, params.sessionID);
        const history =
          (await this.get<ReasonixHistoryMessage[]>(instance, "/history", {
            path: session.path,
          })) ?? [];
        return {
          messages: toMessages(params.sessionID, history),
          parts: toHistoryParts(params.sessionID, history),
        };
      }),
  };

  /**
   * Follows one session root. Reasonix's own names are translated to the SDK
   * event shapes, so every consumer above this line stays unchanged.
   */
  readonly event = {
    subscribe: async (params?: {
      directory?: string;
      signal?: AbortSignal;
    }): Promise<{
      stream: AsyncGenerator<unknown, unknown, unknown> | null;
    }> => {
      const instance = await getInstance(this.rootFor(params?.directory));
      const signal = params?.signal ?? new AbortController().signal;
      const translator = new ReasonixEventTranslator(instance.root);

      return {
        stream: (async function* translate(): AsyncGenerator<unknown, void, unknown> {
          for await (const frame of streamEvents(
            instance.baseUrl,
            instance.token,
            "/events?all=1",
            signal,
          )) {
            for (const event of translator.translate(
              frame as Parameters<typeof translator.translate>[0],
            )) {
              yield { directory: instance.root, event } satisfies {
                directory: string;
                event: Event;
              };
            }
          }
        })(),
      };
    },
  };

  /**
   * Finds the session the bot knows by id and returns the transcript path
   * Reasonix addresses it by. A session of this instance is in memory and has no
   * file yet; a session adopted from the desktop is a transcript on disk.
   */
  private async resolve(instance: ReasonixInstance, sessionId: string): Promise<ReasonixSession> {
    const rows = await this.get<ReasonixSessionRow[]>(instance, "/sessions");
    const row = (rows ?? []).find((candidate) => sessionIdOf(candidate) === sessionId);
    if (!row) {
      throw new ReasonixRequestError(`session ${sessionId} not found`, 404, "/sessions");
    }
    return {
      id: sessionIdOf(row),
      path: row.path ?? sessionId,
      title: row.title ?? row.name ?? row.preview ?? sessionIdOf(row).slice(0, 8),
      workspaceRoot: instance.root,
    };
  }

  private async titleFor(instance: ReasonixInstance, session: ReasonixSession): Promise<string> {
    try {
      const rows = await this.get<ReasonixHistoryMessage[]>(instance, "/history", {
        path: session.path,
      });
      // The host injects its context snapshot as the first user message, so
      // only what the person typed may name the session.
      const firstUser = (rows ?? []).find(
        (row) =>
          row?.role === "user" &&
          typeof row.content === "string" &&
          row.content.trim().length > 0 &&
          !row.content.trimStart().startsWith("<session-context"),
      );
      const text = firstUser?.content?.trim().replace(/\s+/g, " ");
      if (!text) {
        return session.title;
      }
      return text.length > 60 ? `${text.slice(0, 59)}…` : text;
    } catch (error) {
      logger.debug(
        `[ReasonixClient] Could not derive a title for ${session.id}: ${errorText(error)}`,
      );
      return session.title;
    }
  }

  /**
   * Reasonix lets one runtime write to a session at a time. A session the
   * desktop still holds is watched read-only until the writer lease is taken
   * here, which is what `POST /resume` followed by `POST /reclaim` does.
   */
  private async ensureWritable(
    instance: ReasonixInstance,
    session: ReasonixSession,
  ): Promise<void> {
    await this.post(instance, "/resume", { path: session.path });
    await this.post(instance, "/reclaim", { sessionPath: session.path });
  }

  /**
   * Whether a prompt can be sent to a session right now: Reasonix refuses
   * writes to a session another runtime still holds.
   */
  async isWritable(directory: string | undefined, sessionId: string): Promise<boolean> {
    try {
      const instance = await getInstance(this.rootFor(directory));
      await this.ensureWritable(instance, await this.resolve(instance, sessionId));
      return true;
    } catch (error) {
      logger.debug(`[ReasonixClient] ${sessionId} is not writable: ${errorText(error)}`);
      return false;
    }
  }
}

function findState(states: ReasonixRuntimeStatesResponse | undefined, session: ReasonixSession) {
  return (states?.sessions ?? [])
    .map((entry) => entry?.state)
    .find(
      (state) =>
        state?.sessionId === session.id || withoutPrefix(state?.sessionPath) === session.path,
    );
}

/** Reasonix prefixes a session it holds in memory, to tell it from a transcript. */
function withoutPrefix(sessionPath: string | undefined): string | undefined {
  return sessionPath?.replace(/^session-id:/, "");
}

/**
 * A session of the current instance is listed by id; one that already exists on
 * disk is listed by transcript path, so the last path segment stands in for the
 * id the bot remembers.
 */
function sessionIdOf(row: ReasonixSessionRow): string {
  return row.sessionId ?? row.path?.split("/").pop() ?? "";
}

/** Reasonix lists the same model under every provider that offers it. */
function dedupeModels(
  rows: NonNullable<ReasonixModelsResponse["models"]>,
): NonNullable<ReasonixModelsResponse["models"]> {
  const seen = new Set<string>();
  const unique: NonNullable<ReasonixModelsResponse["models"]> = [];
  for (const row of rows) {
    const ref = row?.ref;
    if (!ref || seen.has(ref)) {
      continue;
    }
    seen.add(ref);
    unique.push(row);
  }
  return unique;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const reasonixClient = new ReasonixClient();
