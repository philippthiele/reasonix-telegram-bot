import { Keyboard } from "grammy";
import { formatModelForButton } from "../../app/types/model.js";
import type { ModelInfo } from "../../app/types/model.js";
import type { ContextInfo } from "./keyboard-types.js";
import { t } from "../../i18n/index.js";

/**
 * Format token count for display (e.g., 150000 -> "150K", 1500000 -> "1.5M")
 */
function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${Math.round(count / 1000)}K`;
  }
  return count.toString();
}

/**
 * Format context information for button
 */
function formatContextForButton(contextInfo: ContextInfo): string {
  const used = formatTokenCount(contextInfo.tokensUsed);
  const limit = formatTokenCount(contextInfo.tokensLimit);
  const percent = Math.round((contextInfo.tokensUsed / contextInfo.tokensLimit) * 100);
  return t("keyboard.context", { used, limit, percent });
}

/**
 * Create Reply Keyboard with model, variant, and context indicators
 * @param currentModel Current model info
 * @param contextInfo Optional context information (tokens used/limit)
 * @param variantName Optional variant display name (e.g., "💭 Default")
 * @param queuedPromptLabels Optional queued prompt labels, one row each above the fixed grid
 * @returns Reply Keyboard with queued prompts on top, context in the next row,
 *          model and variant in the last row
 */
export function createMainKeyboard(
  currentModel: ModelInfo,
  contextInfo?: ContextInfo,
  variantName?: string,
  queuedPromptLabels: string[] = [],
): Keyboard {
  const keyboard = new Keyboard();

  // Format model with compact provider/model text and icon
  const modelText = formatModelForButton(currentModel.providerID, currentModel.modelID);

  // Context text - show "0" if no data available
  const contextText = contextInfo
    ? formatContextForButton(contextInfo)
    : t("keyboard.context_empty");

  // Variant text - default to "💭 Default" if not provided
  const variantText = variantName || t("keyboard.variant_default");

  // Queued prompts sit above the fixed grid, one per row
  for (const label of queuedPromptLabels) {
    keyboard.text(label).row();
  }

  // Row 1: context
  keyboard.text(contextText).row();

  // Row 2: model and variant buttons
  keyboard.text(modelText).text(variantText).row();

  return keyboard.resized().persistent();
}

/**
 * Remove Reply Keyboard (for cleanup)
 */
export function removeKeyboard(): { remove_keyboard: true } {
  return { remove_keyboard: true };
}
