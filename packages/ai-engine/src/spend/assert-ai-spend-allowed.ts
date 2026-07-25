import type { AiSpendLimits } from "@repo/shared-types";

import {
  findExhaustedMeter,
  isSoftWarnRemaining,
  type AiSpendBlockReason,
} from "./limits.js";
import { emptyAiSpendCounters, type AiSpendCounters } from "./storage.js";
import { AiSpendLimitError } from "./errors.js";

export interface AssertAiSpendAllowedInput {
  readonly tenantLimits?: AiSpendLimits | null;
  readonly roleLimits?: AiSpendLimits | null;
  readonly tenantUsed?: AiSpendCounters | null;
  readonly userUsed?: AiSpendCounters | null;
  /** When false / omitted with no userUsed check, only tenant limits apply. */
  readonly checkRole?: boolean;
}

export function evaluateAiSpend(input: AssertAiSpendAllowedInput): {
  readonly blocked: boolean;
  readonly blockReason?: AiSpendBlockReason;
  readonly softWarn: boolean;
} {
  const tenantUsed = input.tenantUsed ?? emptyAiSpendCounters();
  const tenantReason = findExhaustedMeter({
    limits: input.tenantLimits,
    used: tenantUsed,
    scope: "tenant",
  });
  if (tenantReason) {
    return { blocked: true, blockReason: tenantReason, softWarn: false };
  }

  if (input.checkRole !== false && input.roleLimits) {
    const userUsed = input.userUsed ?? emptyAiSpendCounters();
    const roleReason = findExhaustedMeter({
      limits: input.roleLimits,
      used: userUsed,
      scope: "role",
    });
    if (roleReason) {
      return { blocked: true, blockReason: roleReason, softWarn: false };
    }
  }

  const softWarn =
    isSoftWarnRemaining(
      tenantUsed.inputTokens,
      input.tenantLimits?.monthlyInputTokens,
    ) ||
    isSoftWarnRemaining(
      tenantUsed.outputTokens,
      input.tenantLimits?.monthlyOutputTokens,
    ) ||
    isSoftWarnRemaining(
      tenantUsed.estimatedCostUsd,
      input.tenantLimits?.monthlyBudgetUsd,
    ) ||
    (input.checkRole !== false &&
      !!input.roleLimits &&
      (isSoftWarnRemaining(
        (input.userUsed ?? emptyAiSpendCounters()).inputTokens,
        input.roleLimits.monthlyInputTokens,
      ) ||
        isSoftWarnRemaining(
          (input.userUsed ?? emptyAiSpendCounters()).outputTokens,
          input.roleLimits.monthlyOutputTokens,
        ) ||
        isSoftWarnRemaining(
          (input.userUsed ?? emptyAiSpendCounters()).estimatedCostUsd,
          input.roleLimits.monthlyBudgetUsd,
        )));

  return { blocked: false, softWarn };
}

export function assertAiSpendAllowed(input: AssertAiSpendAllowedInput): void {
  const result = evaluateAiSpend(input);
  if (result.blocked && result.blockReason) {
    throw new AiSpendLimitError(result.blockReason);
  }
}
