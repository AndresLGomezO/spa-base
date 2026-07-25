import type { AiSpendLimits } from "@repo/shared-types";

import type { AiSpendCounters } from "./storage.js";

export type AiSpendMeter =
  | "monthlyInputTokens"
  | "monthlyOutputTokens"
  | "monthlyBudgetUsd";

export type AiSpendScope = "tenant" | "role";

export interface AiSpendBlockReason {
  readonly scope: AiSpendScope;
  readonly meter: AiSpendMeter;
  readonly limit: number;
  readonly used: number;
}

export function minOptional(
  a: number | undefined,
  b: number | undefined,
): number | undefined {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

/** Strictest (min) per meter across role limits. Unset fields stay unlimited. */
export function mergeStrictestAiSpendLimits(
  limitsList: readonly (AiSpendLimits | null | undefined)[],
): AiSpendLimits | undefined {
  let merged: AiSpendLimits | undefined;
  for (const limits of limitsList) {
    if (!limits) continue;
    merged = {
      monthlyInputTokens: minOptional(
        merged?.monthlyInputTokens,
        limits.monthlyInputTokens,
      ),
      monthlyOutputTokens: minOptional(
        merged?.monthlyOutputTokens,
        limits.monthlyOutputTokens,
      ),
      monthlyBudgetUsd: minOptional(
        merged?.monthlyBudgetUsd,
        limits.monthlyBudgetUsd,
      ),
    };
  }
  if (
    !merged ||
    (merged.monthlyInputTokens == null &&
      merged.monthlyOutputTokens == null &&
      merged.monthlyBudgetUsd == null)
  ) {
    return undefined;
  }
  return merged;
}

export function remainingForMeter(
  used: number,
  limit: number | undefined,
): number | null {
  if (limit == null) return null;
  return Math.max(0, limit - used);
}

export function isMeterExhausted(
  used: number,
  limit: number | undefined,
): boolean {
  return limit != null && used >= limit;
}

export function findExhaustedMeter(input: {
  readonly limits: AiSpendLimits | null | undefined;
  readonly used: AiSpendCounters;
  readonly scope: AiSpendScope;
}): AiSpendBlockReason | null {
  const { limits, used, scope } = input;
  if (!limits) return null;

  if (isMeterExhausted(used.inputTokens, limits.monthlyInputTokens)) {
    return {
      scope,
      meter: "monthlyInputTokens",
      limit: limits.monthlyInputTokens!,
      used: used.inputTokens,
    };
  }
  if (isMeterExhausted(used.outputTokens, limits.monthlyOutputTokens)) {
    return {
      scope,
      meter: "monthlyOutputTokens",
      limit: limits.monthlyOutputTokens!,
      used: used.outputTokens,
    };
  }
  if (isMeterExhausted(used.estimatedCostUsd, limits.monthlyBudgetUsd)) {
    return {
      scope,
      meter: "monthlyBudgetUsd",
      limit: limits.monthlyBudgetUsd!,
      used: used.estimatedCostUsd,
    };
  }
  return null;
}

export function isSoftWarnRemaining(
  used: number,
  limit: number | undefined,
  threshold = 0.1,
): boolean {
  if (limit == null || limit <= 0) return false;
  const remaining = limit - used;
  return remaining > 0 && remaining / limit < threshold;
}
