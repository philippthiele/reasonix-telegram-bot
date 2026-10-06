import { createHash } from "node:crypto";
import path from "node:path";
import type { Event, Model, Provider, Session, SessionStatus, Todo } from "@opencode-ai/sdk/v2";
import { logger } from "../utils/logger.js";
import {
  configuredRoots,
  getInstance,
  reasonixHome,
  type ReasonixInstance,
} from "./instance.js";
import { ReasonixEventTranslator } from "./events.js";
import { ReasonixRequestError, request, streamEvents } from "./http.js";
import {
  toCommand,
  toGlobalSession,
  toHistoryParts,
  toMessages,
  toModel,
  toProvider,
  toSession,
  toSessionAddress,
  toTodos,
} from "./mappers.js";
import type {
  CommandListData,
  GlobalHealthData,
  GlobalSession,
  PermissionListData,
  Project,
  QuestionListData,
  SessionAbortData,
  SessionCreateData,
  SessionGetData,
  SessionListData,
  SessionDeleteData,
  SessionForkData,
  SessionMessageData,
  SessionMessagesData,
  SessionPromptData,
  SessionRevertData,
  SessionStatusData,
  SessionSummarizeData,
  ConfigProvidersData,
  PathGetData,
} from "./sdk-types.js";
import type {
  ReasonixCommand,
  ReasonixInboxItem,
  ReasonixInboxState,
  ReasonixHistoryMessage,
  ReasonixModelsResponse,
  ReasonixPermissionSnapshot,
  ReasonixRuntimeStatesResponse,
  ReasonixAskFrame,
  ReasonixRuntimeState,
  ReasonixSessionRow,
  ReasonixStatusResponse,
  ReasonixTodos,
} from "./types.js";

export type Result<T> = { data: T; error: undefined } | { data: undefined; error: unknown };

// Reasonix reports a new session the moment it exists, so one look is normally
// enough; the wait only covers an answer that arrives out of order.
const CREATE_POLL_ATTEMPTS = 5;
const CREATE_POLL_INTERVAL_MS = 200;

/** A session as Reasonix addresses it: by id while in memory, by transcript path once on disk. */
export interface ReasonixSession {
  id: string;
  path: string;
  title: string;
  workspaceRoot: string;
}

/**
 * The instance was running a turn and cannot switch its attention away. A
 * serve process works on one session at a time, so a second conversation in the
 * same folder has to wait for the first to stop.
 */
/** Where a prompt waits while a session is busy: for the running turn, or for its end. */
export class ReasonixBusyError extends Error {
  constructor(readonly root: string) {
    super(`Reasonix is still working in ${root}`);
    this.name = "ReasonixBusyError";
  }
}

/** What the bot asks Reasonix to confirm, before it is answered. */
export interface AnswerPayload {
  requestId: string;
  answers: Array<{ questionId: string; selected: string[] }>;
  sessionId?: string;
}

/**
 * The Reasonix-backed stand-in for the Reasonix SDK client.
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

  /**
   * Runs one call per configured root and puts the answers together. A root that
   * cannot be reached is left out rather than failing the whole list, so one
   * folder that is gone does not hide every other folder's sessions.
   */
  private async callEveryRoot<T>(run: (instance: ReasonixInstance) => Promise<T[]>): Promise<T[]> {
    const roots = configuredRoots();
    const answers = await Promise.all(
      roots.map(async (root) => {
        try {
          return await run(await getInstance(root));
        } catch (error) {
          logger.warn(`[ReasonixClient] Skipping ${root}: ${errorText(error)}`);
          return [];
        }
      }),
    );
    return answers.flat();
  }

  private get<T>(
    instance: ReasonixInstance,
    endpoint: string,
    query?: Record<string, string> | undefined,
    signal?: AbortSignal,
  ): Promise<T | undefined> {
    return request<T>(instance.baseUrl, instance.token, endpoint, {
      ...(query ? { query } : {}),
      ...(signal ? { signal } : {}),
    });
  }

  private post<T>(
    instance: ReasonixInstance,
    endpoint: string,
    body?: unknown,
  ): Promise<T | undefined> {
    return request<T>(instance.baseUrl, instance.token, endpoint, { body: body ?? {} });
  }

  private delete<T>(instance: ReasonixInstance, endpoint: string): Promise<T | undefined> {
    return request<T>(instance.baseUrl, instance.token, endpoint, { method: "DELETE" });
  }

  readonly session = {
    /**
     * The sessions of one root, or of every root the bot may serve when no root
     * is named. Reasonix serves a single workspace per process, so the list of
     * everything the bot can reach is the list of its instances put together.
     */
    list: async (params?: {
      directory?: string;
      roots?: boolean;
      limit?: number;
      start?: number;
    }): Promise<Result<SessionListData>> =>
      this.call(params?.directory, async (instance) => {
        const rows = await this.get<ReasonixSessionRow[]>(instance, "/sessions");
        return (rows ?? []).map((row) => toSession(row, instance.root));
      }),

    get: async (params: { sessionID: string; directory?: string }): Promise<Result<SessionGetData>> =>
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
     * Starts a session in this instance's workspace. The answer is empty, and the
     * runtime only moves its attention to the new session once the old one is
     * idle, so the id is the one session that appeared.
     */
    create: async (params?: {
      directory?: string;
      title?: string;
      parentID?: string;
    }): Promise<Result<SessionCreateData>> =>
      this.call(params?.directory, async (instance) => {
        const before = new Set(await this.sessionIds(instance));
        try {
          await this.post(instance, "/new", {});
        } catch (error) {
          if (isSwitchRefusal(error)) {
            throw new ReasonixBusyError(instance.root);
          }
          throw error;
        }
        for (let attempt = 0; attempt < CREATE_POLL_ATTEMPTS; attempt += 1) {
          const fresh = (await this.sessionIds(instance)).find((id) => !before.has(id));
          if (fresh) {
            const rows = await this.get<ReasonixSessionRow[]>(instance, "/sessions");
            const row = (rows ?? []).find((candidate) => sessionIdOf(candidate) === fresh);
            return toSession(row ?? { sessionId: fresh }, instance.root);
          }
          await sleep(CREATE_POLL_INTERVAL_MS);
        }
        throw new ReasonixRequestError("Reasonix did not report the new session", 500, "/new");
      }),

    /**
     * Sends a turn into the session inbox and answers the id it waits under.
     * Reasonix offers no steering of a running turn, so a prompt is submitted
     * straight away when the session is free and queued when it is not.
     */
    promptAsync: async (params: {
      sessionID: string;
      parts?: Array<{ type: string; text?: string }>;
      directory?: string;
    }): Promise<Result<{ inboxID: string }>> =>
      this.call(params.directory, async (instance) => {
        const text = promptText(params.parts);
        if (text.trim().length === 0) {
          throw new ReasonixRequestError("Reasonix prompts carry text only", 400, "/inbox/items");
        }
        const session = await this.resolve(instance, params.sessionID);

        try {
          await this.post(instance, "/submit", {
            submissionId: `tg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            input: text,
            path: session.path,
          });
          return { inboxID: session.id };
        } catch (error) {
          if (!(error instanceof ReasonixRequestError) || error.status !== 409) {
            throw error;
          }
        }

        const item = await this.post<ReasonixInboxItem>(instance, "/inbox/items", {
          input: text,
          path: session.path,
        });
        if (!item?.itemId) {
          throw new ReasonixRequestError(
            "Reasonix did not report the queued prompt",
            500,
            "/inbox/items",
          );
        }
        return { inboxID: item.itemId };
      }),

    /** The follow-up queue of a session. */
    inbox: {
      /**
       * Ids of the prompts still waiting. Reasonix reports the queue of the
       * session its runtime is on, so any other session has none waiting.
       */
      list: async (params: { sessionID: string; directory?: string }): Promise<Result<string[]>> =>
        this.call(params.directory, async (instance) => {
          const session = await this.resolve(instance, params.sessionID);
          const state = await this.get<ReasonixInboxState>(instance, "/inbox");
          if (state?.sessionPath !== session.path) {
            return [];
          }
          return (state.items ?? []).filter((item) => item?.id).map((item) => item.id as string);
        }),

      /**
       * Withdraws a waiting prompt. One that Reasonix already picked up cannot
       * be taken back, and counts as withdrawn all the same.
       */
      cancel: async (params: {
        sessionID: string;
        inboxID: string;
        directory?: string;
      }): Promise<Result<true>> =>
        this.call(params.directory, async (instance) => {
          await this.resolve(instance, params.sessionID);
          try {
            await this.delete(instance, `/inbox/items/${params.inboxID}`);
          } catch (error) {
            if (
              error instanceof ReasonixRequestError &&
              (error.status === 409 || error.status === 404)
            ) {
              return true as const;
            }
            throw error;
          }
          return true as const;
        }),
    },

    /**
     * What every session of the instance is doing. Reasonix keeps one runtime
     * per workspace and reports the state of the sessions it holds.
     */
    status: async (params?: {
      directory?: string;
    }): Promise<Result<SessionStatusData>> =>
      this.call(params?.directory, async (instance) => {
        const response = await this.get<ReasonixRuntimeStatesResponse>(instance, "/runtime-states");
        const statuses: Record<string, SessionStatus> = {};

        for (const entry of response?.sessions ?? []) {
          const state = entry?.state;
          const id = state?.sessionId ?? withoutPrefix(entry?.sessionPath);
          if (!id) {
            continue;
          }
          statuses[id] = toSessionStatus(state);
        }

        return statuses;
      }),

    /** The transcript of a session, newest message last. */
    messages: async (params: {
      sessionID: string;
      directory?: string;
      limit?: number;
      before?: string;
    }): Promise<Result<SessionMessagesData>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.resolve(instance, params.sessionID);
        const history =
          (await this.get<ReasonixHistoryMessage[]>(instance, "/history", {
            path: session.path,
          })) ?? [];
        const infos = toMessages(session.id, history);
        const allParts = toHistoryParts(session.id, history);

        let messages = infos.map((info) => ({
          info,
          parts: allParts.filter((part) => part.messageID === info.id),
        }));

        if (params.before) {
          const index = messages.findIndex((entry) => entry.info.id === params.before);
          if (index >= 0) {
            messages = messages.slice(0, index);
          }
        }
        if (params.limit && params.limit > 0) {
          messages = messages.slice(-params.limit);
        }

        return messages;
      }),

    /** One message of a session, as its info and its parts. */
    message: async (params: {
      sessionID: string;
      messageID: string;
      directory?: string;
    }): Promise<Result<SessionMessageData>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.resolve(instance, params.sessionID);
        const history =
          (await this.get<ReasonixHistoryMessage[]>(instance, "/history", {
            path: session.path,
          })) ?? [];
        const infos = toMessages(session.id, history);
        const info = infos.find((candidate) => candidate.id === params.messageID);
        if (!info) {
          throw new ReasonixRequestError("message not found", 404, "/history");
        }
        const parts = toHistoryParts(session.id, history).filter(
          (part) => part.messageID === info.id,
        );
        return { info, parts };
      }),

    /** Removes a session. Reasonix names the session by its transcript file. */
    delete: async (params: {
      sessionID: string;
      directory?: string;
    }): Promise<Result<SessionDeleteData>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.resolve(instance, params.sessionID);
        await this.post(instance, "/delete-session", { name: withoutPrefix(session.path) });
        return true;
      }),

    /**
     * Drops the conversation and keeps the session. Reasonix rewinds the
     * conversation, so the transcript is not truncated and the id still works.
     */
    unrevert: async (params: {
      sessionID: string;
      directory?: string;
    }): Promise<Result<SessionRevertData>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.requireCurrent(instance, params.sessionID, "/rewind");
        await this.post(instance, "/rewind", {
          scope: "conversation",
          turn: await this.turnOf(instance, session, undefined),
        });
        return this.sessionRow(instance, session.id);
      }),

    /**
     * Rewinds the conversation to the turn that holds a message. Reasonix counts
     * turns rather than message ids, so the message is looked up in the
     * transcript first.
     */
    revert: async (params: {
      sessionID: string;
      messageID?: string;
      directory?: string;
    }): Promise<Result<SessionRevertData>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.requireCurrent(instance, params.sessionID, "/rewind");
        await this.post(instance, "/rewind", {
          scope: "conversation",
          turn: await this.turnOf(instance, session, params.messageID),
        });
        return this.sessionRow(instance, session.id);
      }),

    /**
     * Branches a new session from the turn that holds a message. The new session
     * becomes the instance's current one, which is what the bot then attaches to.
     */
    fork: async (params: {
      sessionID: string;
      messageID?: string;
      directory?: string;
    }): Promise<Result<SessionForkData>> =>
      this.call(params?.directory, async (instance) => {
        const source = await this.requireCurrent(instance, params.sessionID, "/fork");
        const before = new Set(await this.sessionIds(instance));
        await this.post(instance, "/fork", {
          turn: await this.turnOf(instance, source, params.messageID),
        });

        const fresh = (await this.sessionIds(instance)).find((id) => !before.has(id));
        if (!fresh) {
          throw new ReasonixRequestError("Reasonix did not report the forked session", 500, "/fork");
        }
        const rows = await this.get<ReasonixSessionRow[]>(instance, "/sessions");
        const row = (rows ?? []).find((candidate) => sessionIdOf(candidate) === fresh);
        return toSession(row ?? { sessionId: fresh }, instance.root);
      }),

    /**
     * Compacts the transcript with a summarizer. Reasonix summarizes from a turn
     * onwards, so the whole conversation is summarized from its start.
     */
    summarize: async (params: {
      sessionID: string;
      providerID?: string;
      modelID?: string;
      directory?: string;
    }): Promise<Result<SessionSummarizeData>> =>
      this.call(params?.directory, async (instance) => {
        await this.requireCurrent(instance, params.sessionID, "/summarize");
        await this.post(instance, "/summarize", { turn: 0, mode: "from" });
        return true;
      }),

    /**
     * Sends a turn and waits for the answer. Reasonix has no request that
     * returns one, so the turn is submitted and then the transcript is read back
     * once the session is idle again. A busy session is refused, and the prompt
     * is then queued as a follow-up instead of lost.
     */
    prompt: async (params: {
      sessionID: string;
      parts?: Array<{ type: string; text?: string }>;
      directory?: string;
    }): Promise<Result<SessionPromptData>> =>
      this.call(params.directory, async (instance) => {
        const text = promptText(params.parts);

        if (text.trim().length === 0) {
          throw new ReasonixRequestError("Reasonix prompts carry text only", 400, "/submit");
        }

        const session = await this.resolve(instance, params.sessionID);
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

        return this.answerOf(instance, session);
      }),

    abort: async (params: {
      sessionID: string;
      directory?: string;
    }): Promise<Result<SessionAbortData>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.resolve(instance, params.sessionID);
        const states = await this.get<ReasonixRuntimeStatesResponse>(instance, "/runtime-states");
        const state = findState(states, session);
        if (!state?.turnId) {
          return false;
        }
        await this.post(instance, "/cancel", { turnId: state.turnId, path: session.path });
        return true;
      }),
  };

  /**
   * The roots as projects. Reasonix serves one workspace per process and keeps
   * no list of workspaces, so the folders the bot was pointed at are the
   * projects, each carrying the newest session it holds.
   */
  readonly project = {
    list: async (): Promise<Result<Project[]>> => {
      try {
        const newest = new Map<string, number>();
        for (const session of await this.callEveryRoot(async (instance) => {
          const rows = await this.get<ReasonixSessionRow[]>(instance, "/sessions");
          return (rows ?? []).map((row) => toSession(row, instance.root));
        })) {
          const updated = session.time?.updated ?? 0;
          newest.set(session.directory, Math.max(newest.get(session.directory) ?? 0, updated));
        }

        return {
          data: configuredRoots().map((root) => ({
            id: `dir_${hashOf(root)}`,
            worktree: root,
            name: path.basename(root) || root,
            time: { created: 0, updated: newest.get(root) ?? 0 },
            sandboxes: [],
          })),
          error: undefined,
        };
      } catch (error) {
        return { data: undefined, error };
      }
    },
  };

  /**
   * Every session the bot can reach, newest first, across all configured roots.
   */
  readonly experimental = {
    session: {
      list: async (params?: {
        roots?: boolean;
        limit?: number;
      }): Promise<Result<GlobalSession[]>> => {
        try {
          const sessions = await this.callEveryRoot(async (instance) => {
            const rows = await this.get<ReasonixSessionRow[]>(instance, "/sessions");
            return (rows ?? []).map((row) => toGlobalSession(row, instance.root));
          });

          const newestFirst = sessions
            .filter((session) => session.directory.length > 0)
            .sort((left, right) => (right.time?.updated ?? 0) - (left.time?.updated ?? 0));
          const limited =
            params?.limit && params.limit > 0 ? newestFirst.slice(0, params.limit) : newestFirst;

          return { data: limited, error: undefined };
        } catch (error) {
          return { data: undefined, error };
        }
      },
    },
  };

  readonly permission = {
    /** Reasonix holds at most one pending approval per session. */
    list: async (params?: { directory?: string }): Promise<Result<PermissionListData>> =>
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
      reply?: "once" | "always" | "reject";
      message?: string;
      directory?: string;
    }): Promise<Result<boolean>> =>
      this.call(params?.directory, async (instance) => {
        const snapshot = await this.get<ReasonixPermissionSnapshot>(instance, "/permission");
        await this.post(instance, "/approve", {
          id: params.requestID,
          allow: (params.reply ?? "once") !== "reject",
          permissionRevision: snapshot?.revision ?? 0,
          generation: snapshot?.generation ?? 0,
        });
        return true;
      }),
  };

  readonly question = {
    list: async (params?: { directory?: string }): Promise<Result<QuestionListData>> =>
      this.call(params?.directory, async (instance) => {
        const pending =
          (await this.get<Array<{ ask?: ReasonixAskFrame }>>(instance, "/pending-prompts")) ?? [];
        return pending
          .filter((entry) => entry?.ask?.id)
          .map((entry) => {
            const ask = entry.ask as ReasonixAskFrame;
            return {
              id: ask.id as string,
              sessionID: "",
              questions: (ask.questions ?? []).map((question) => ({
                id: question.id ?? "",
                question: question.prompt ?? "",
                header: question.header ?? "",
                options: (question.options ?? []).map((option) => ({
                  label: option.label ?? "",
                  description: option.description ?? option.label ?? "",
                })),
                multiple: question.multi === true,
              })),
            };
          });
      }),

    reply: async (params: {
      requestID: string;
      answers?: Array<{ questionId: string; selected: string[] }>;
      directory?: string;
    }): Promise<Result<boolean>> =>
      this.call(params.directory, async (instance) => {
        await this.post(instance, "/answer", {
          id: params.requestID,
          answers: (params.answers ?? []).map((answer) => ({
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

  /** The model catalog, which Reasonix keeps per workspace alongside the models. */
  readonly config = {
    providers: async (params?: { directory?: string }): Promise<Result<ConfigProvidersData>> =>
      this.call(params?.directory, async (instance) => {
        const response = await this.get<ReasonixModelsResponse>(instance, "/models");
        const models = dedupeModels(response?.models ?? []).map((entry) =>
          toModel(entry.ref ?? "", entry.model ?? entry.ref ?? ""),
        );
        const providerIds = [...new Set(models.map((model) => model.providerID))];
        const providers = providerIds.map((id) => toProvider(id, models));

        const defaults: Record<string, string> = {};
        if (response?.current) {
          const [providerID, modelID] = String(response.current).split("/");
          if (providerID && modelID) {
            defaults[providerID] = modelID;
          }
        }

        return { providers, default: defaults };
      }),
  };

  /**
   * The active model's live status. `window` is the context window Reasonix
   * actually enforces; it is the only source for it, since `GET /models` does
   * not carry a context limit.
   */
  readonly status = {
    get: async (params?: { directory?: string }): Promise<Result<ReasonixStatusResponse>> =>
      this.call(params?.directory, async (instance) => {
        const response = await this.get<ReasonixStatusResponse>(instance, "/status");
        return response ?? {};
      }),
  };

  /**
   * Where Reasonix keeps its state. The bot needs this to find the transcripts
   * of sessions that live on disk but are not held by any instance.
   */
  readonly path = {
    get: async (): Promise<Result<PathGetData>> => {
      const home = reasonixHome();
      return {
        data: {
          home,
          state: path.join(home, "projects"),
          config: home,
          worktree: this.activeRoot,
          directory: this.activeRoot,
        },
        error: undefined,
      };
    },
  };

  readonly model = {
    list: async (params?: { directory?: string }): Promise<Result<Model[]>> =>
      this.call(params?.directory, async (instance) => {
        const response = await this.get<ReasonixModelsResponse>(instance, "/models");
        return dedupeModels(response?.models ?? []).map((entry) =>
          toModel(entry.ref ?? "", entry.model ?? entry.ref ?? ""),
        );
      }),

    providers: async (params?: { directory?: string }): Promise<Result<Provider[]>> =>
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
    list: async (params?: { directory?: string }): Promise<Result<CommandListData>> =>
      this.call(params?.directory, async (instance) => {
        const rows = await this.get<ReasonixCommand[]>(instance, "/commands");
        return (rows ?? []).filter((row) => typeof row?.name === "string").map(toCommand);
      }),
  };

  readonly todo = {
    list: async (params: { sessionID: string; directory?: string }): Promise<Result<Todo[]>> =>
      this.call(params?.directory, async (instance) => {
        const session = await this.resolve(instance, params.sessionID);
        const rows = await this.get<ReasonixTodos>(instance, "/todos", { path: session.path });
        return toTodos(rows);
      }),
  };

  readonly skill = {
    list: async (params?: { directory?: string }): Promise<Result<Array<{ name: string; description: string }>>> =>
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
      signal?: AbortSignal;
    }): Promise<Result<GlobalHealthData>> =>
      this.call(params?.directory, async (instance) => {
        // Any answer at all proves the server is up, and `/models` needs no
        // session context; Reasonix has no health route of its own.
        await this.get<ReasonixModelsResponse>(instance, "/models", undefined, params?.signal);
        return { healthy: true, version: REASONIX_VERSION };
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
    }): Promise<Result<{ stream: AsyncGenerator<unknown, unknown, unknown> | null }>> => {
      const instance = await getInstance(this.rootFor(params?.directory));
      const signal = params?.signal ?? new AbortController().signal;
      const translator = new ReasonixEventTranslator(instance.root);

      return {
        data: {
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
        },
        error: undefined,
      };
    },
  };

  /**
   * The turn number a message sits in. Reasonix counts turns from one, and a turn
   * starts at each user message, so the count of user messages up to and including
   * the one that holds the message is the turn to branch or rewind at.
   */
  private async turnOf(
    instance: ReasonixInstance,
    session: ReasonixSession,
    messageID: string | undefined,
  ): Promise<number> {
    const history =
      (await this.get<ReasonixHistoryMessage[]>(instance, "/history", { path: session.path })) ?? [];

    if (!messageID) {
      return Math.max(history.filter((entry) => entry.role === "user").length, 1);
    }

    const index = history.findIndex((entry) => entry.messageId === messageID);
    if (index < 0) {
      throw new ReasonixRequestError("message not found", 404, "/history");
    }
    return Math.max(history.slice(0, index + 1).filter((entry) => entry.role === "user").length, 1);
  }

  /**
   * Waits for the session to fall idle and reads the last thing the assistant
   * said, which is the answer a caller of `session.prompt` is waiting for.
   */
  private async answerOf(
    instance: ReasonixInstance,
    session: ReasonixSession,
  ): Promise<SessionPromptData> {
    const deadline = Date.now() + PROMPT_ANSWER_TIMEOUT_MS;
    for (;;) {
      const states = await this.get<ReasonixRuntimeStatesResponse>(instance, "/runtime-states");
      const state = findState(states, session);
      if (state && !state.running && state.phase === "idle") {
        break;
      }
      if (Date.now() >= deadline) {
        throw new ReasonixRequestError("Reasonix did not finish the turn in time", 504, "/submit");
      }
      await sleep(PROMPT_POLL_INTERVAL_MS);
    }

    const history =
      (await this.get<ReasonixHistoryMessage[]>(instance, "/history", { path: session.path })) ?? [];
    const messages = toMessages(session.id, history);
    const answer = messages.filter((message) => message.role === "assistant").pop();
    if (!answer) {
      throw new ReasonixRequestError("Reasonix answered with nothing", 502, "/history");
    }

    const parts = toHistoryParts(session.id, history).filter(
      (part) => part.messageID === answer.id,
    );
    return { info: answer, parts } as SessionPromptData;
  }

  /** Re-reads one session from the instance, as the SDK reports it. */
  private async sessionRow(instance: ReasonixInstance, sessionId: string): Promise<Session> {
    const rows = await this.get<ReasonixSessionRow[]>(instance, "/sessions");
    const row = (rows ?? []).find((candidate) => sessionIdOf(candidate) === sessionId);
    if (!row) {
      throw new ReasonixRequestError(`session ${sessionId} not found`, 404, "/sessions");
    }
    return toSession(row, instance.root);
  }

  private async sessionIds(instance: ReasonixInstance): Promise<string[]> {
    const rows = await this.get<ReasonixSessionRow[]>(instance, "/sessions");
    return (rows ?? []).map(sessionIdOf);
  }

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
    const { id, path } = toSessionAddress(row);
    return {
      id,
      path,
      title: row.title ?? row.name ?? row.preview ?? id.slice(0, 8),
      workspaceRoot: instance.root,
    };
  }

  /**
   * The session a mutating route acts on is the one the instance currently holds,
   * so a request for any other session is refused rather than answered for the
   * wrong conversation.
   */
  private async requireCurrent(
    instance: ReasonixInstance,
    sessionId: string,
    route: string,
  ): Promise<ReasonixSession> {
    const session = await this.resolve(instance, sessionId);
    const states = await this.get<ReasonixRuntimeStatesResponse>(instance, "/runtime-states");
    const state = findState(states, session);
    if (!state?.running && state?.sessionId !== session.id && state?.sessionPath !== session.path) {
      throw new ReasonixRequestError(
        `${route} only applies to the session the instance is on`,
        409,
        route,
      );
    }
    return session;
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

/**
 * Whether Reasonix refused to move its attention because the session it is on
 * is still running. The answer is a 500 whose body names the failed switch.
 */
function isSwitchRefusal(error: unknown): boolean {
  return (
    error instanceof ReasonixRequestError &&
    error.status === 500 &&
    typeof error.body === "string" &&
    error.body.includes("switch session")
  );
}

/** The text a prompt carries; Reasonix takes no other part kind. */
/**
 * What a session is doing, in the shape the bot's attach and busy-tracking code
 * reads. Reasonix reports a phase and whether a turn is under way.
 */
function toSessionStatus(state: ReasonixRuntimeState | undefined): SessionStatus {
  if (!state || state.phase === "idle" || state.running !== true) {
    return { type: "idle" };
  }
  return { type: "busy" };
}

function hashOf(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 16);
}

// Reasonix has no health route to name its own version, so the one this adapter
// was written against is reported instead.
const REASONIX_VERSION = "1.39.7";

// How long `session.prompt` waits for the turn it started, and how often it asks.
const PROMPT_ANSWER_TIMEOUT_MS = 10 * 60_000;
const PROMPT_POLL_INTERVAL_MS = 700;

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

function promptText(parts: Array<{ type: string; text?: string }> | undefined): string {
  return (parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
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
