import type { AiJobModelUsage } from "../schemas/ai-job.schema.js";
import type { AiSpendDelta } from "./storage.js";

export function spendDeltaFromModelUsage(
  usage: AiJobModelUsage | null | undefined,
): AiSpendDelta | null {
  if (!usage) return null;

  const inputTokens = usage.promptTokens ?? 0;
  const outputTokens =
    (usage.candidatesTokens ?? 0) + (usage.thoughtsTokens ?? 0);
  const estimatedCostUsd = usage.estimatedCostUsd ?? 0;

  if (inputTokens === 0 && outputTokens === 0 && estimatedCostUsd === 0) {
    return null;
  }

  return { inputTokens, outputTokens, estimatedCostUsd };
}

/** Jobs attributed to a real user (not system / hooks). */
export function isAttributableAiUserId(
  requestedBy: string | null | undefined,
): boolean {
  const id = requestedBy?.trim() ?? "";
  return id.length > 0 && id !== "system";
}
