import type { OpencodeClient } from "@opencode-ai/sdk/v2";

/**
 * The shapes the bot reads, taken from the SDK client rather than written out
 * here, so a value Reasonix produces is checked against exactly what the
 * feature code has always been handed.
 */
type Data<Method extends (...args: never[]) => Promise<{ data?: unknown }>> = NonNullable<
  Awaited<ReturnType<Method>>["data"]
>;

type Sdk = OpencodeClient;

export type SessionListData = Data<Sdk["session"]["list"]>;
export type SessionGetData = Data<Sdk["session"]["get"]>;
export type SessionCreateData = Data<Sdk["session"]["create"]>;
export type SessionStatusData = Data<Sdk["session"]["status"]>;
export type SessionMessagesData = Data<Sdk["session"]["messages"]>;
export type SessionDeleteData = Data<Sdk["session"]["delete"]>;
export type SessionRevertData = Data<Sdk["session"]["revert"]>;
export type SessionUnrevertData = Data<Sdk["session"]["unrevert"]>;
export type SessionForkData = Data<Sdk["session"]["fork"]>;
export type SessionSummarizeData = Data<Sdk["session"]["summarize"]>;
export type SessionUpdateData = Data<Sdk["session"]["update"]>;
export type SessionMessageData = Data<Sdk["session"]["message"]>;
export type SessionPromptData = Data<Sdk["session"]["prompt"]>;
export type SessionAbortData = Data<Sdk["session"]["abort"]>;

export type PermissionListData = Data<Sdk["permission"]["list"]>;
export type QuestionListData = Data<Sdk["question"]["list"]>;

export type CommandListData = Data<Sdk["command"]["list"]>;
export type ConfigProvidersData = Data<Sdk["config"]["providers"]>;
export type GlobalHealthData = Data<Sdk["global"]["health"]>;
export type ProjectListData = Data<Sdk["project"]["list"]>;
export type GlobalSessionsData = Data<Sdk["experimental"]["session"]["list"]>;
export type PathGetData = Data<Sdk["path"]["get"]>;

export type Project = ProjectListData[number];
export type GlobalSession = GlobalSessionsData[number];
