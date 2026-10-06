import { getCurrentAgent, setCurrentAgent } from "../stores/settings-store.js";
import { logger } from "../../utils/logger.js";

/**
 * Reasonix has no agents. There is nothing to list, nothing to choose between and
 * nothing to validate a name against, so every caller gets the one name the bot
 * keeps for display and for its own bookkeeping.
 */
const REASONIX_AGENT = "build";

/**
 * The agent name the bot reports. A name stored by an earlier version is kept
 * only so it still shows up in status output the way the user last set it.
 */
export function getStoredAgent(): string {
  return getCurrentAgent() ?? REASONIX_AGENT;
}

/**
 * Reasonix always answers as itself, so the preferred name is kept as-is and
 * there is nothing to fall back from.
 */
export async function resolveProjectAgent(preferredAgent?: string): Promise<string> {
  return preferredAgent ?? getStoredAgent();
}

/**
 * Reasonix does not record an agent per message, so this is the stored name.
 */
export async function fetchCurrentAgent(): Promise<string> {
  return getStoredAgent();
}

/**
 * Records a name the user picked. The picker is gone, but the store is still read
 * by the keyboard and status output, so the write stays.
 */
export function selectAgent(agentName: string): void {
  logger.debug(`[AgentManager] Recorded agent name: ${agentName}`);
  setCurrentAgent(agentName);
}

/**
 * Nothing to apply: an agent in Reasonix carries no model or variant of its own.
 * Always reports that it changed nothing.
 */
export async function applyAgentConfiguredSettings(): Promise<boolean> {
  return false;
}
