import type { AiSpendLimits } from "@repo/shared-types";

import {
  remainingForMeter,
  type AiSpendBlockReason,
  type AiSpendMeter,
} from "./limits.js";
import { evaluateAiSpend } from "./assert-ai-spend-allowed.js";
import { emptyAiSpendCounters, type AiSpendCounters } from "./storage.js";

export interface AiSpendBucketStatus {
  readonly limits: AiSpendLimits | null;
  readonly used: AiSpendCounters;
  readonly remaining: {
    readonly monthlyInputTokens: number | null;
    readonly monthlyOutputTokens: number | null;
    readonly monthlyBudgetUsd: number | null;
  };
}

export interface AiSpendStatus {
  readonly period: string;
  readonly tenant: AiSpendBucketStatus;
  readonly user: AiSpendBucketStatus;
  readonly blocked: boolean;
  readonly softWarn: boolean;
  readonly blockReason?: {
    readonly scope: AiSpendBlockReason["scope"];
    readonly meter: AiSpendMeter;
  };
}

function bucketStatus(
  limits: AiSpendLimits | null | undefined,
  used: AiSpendCounters | null | undefined,
): AiSpendBucketStatus {
  const counters = used ?? emptyAiSpendCounters();
  const resolved = limits ?? null;
  return {
    limits: resolved,
    used: counters,
    remaining: {
      monthlyInputTokens: remainingForMeter(
        counters.inputTokens,
        resolved?.monthlyInputTokens,
      ),
      monthlyOutputTokens: remainingForMeter(
        counters.outputTokens,
        resolved?.monthlyOutputTokens,
      ),
      monthlyBudgetUsd: remainingForMeter(
        counters.estimatedCostUsd,
        resolved?.monthlyBudgetUsd,
      ),
    },
  };
}

export function buildAiSpendStatus(input: {
  readonly period: string;
  readonly tenantLimits?: AiSpendLimits | null;
  readonly roleLimits?: AiSpendLimits | null;
  readonly tenantUsed?: AiSpendCounters | null;
  readonly userUsed?: AiSpendCounters | null;
}): AiSpendStatus {
  const evaluation = evaluateAiSpend({
    tenantLimits: input.tenantLimits,
    roleLimits: input.roleLimits,
    tenantUsed: input.tenantUsed,
    userUsed: input.userUsed,
    checkRole: true,
  });

  return {
    period: input.period,
    tenant: bucketStatus(input.tenantLimits, input.tenantUsed),
    user: bucketStatus(input.roleLimits, input.userUsed),
    blocked: evaluation.blocked,
    softWarn: evaluation.softWarn,
    ...(evaluation.blockReason
      ? {
          blockReason: {
            scope: evaluation.blockReason.scope,
            meter: evaluation.blockReason.meter,
          },
        }
      : {}),
  };
}
