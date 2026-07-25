import { z } from "zod";

export const AI_SPEND_COLLECTION = "ai_spend";
export const AI_SPEND_USERS_COLLECTION = "ai_spend_users";

export const aiSpendCountersSchema = z.object({
  inputTokens: z.number().nonnegative().default(0),
  outputTokens: z.number().nonnegative().default(0),
  estimatedCostUsd: z.number().nonnegative().default(0),
});

export type AiSpendCounters = z.infer<typeof aiSpendCountersSchema>;

export const aiSpendRecordSchema = aiSpendCountersSchema.extend({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  updatedAt: z.string().trim().min(1),
  userId: z.string().trim().min(1).optional(),
});

export type AiSpendRecord = z.infer<typeof aiSpendRecordSchema>;

export interface AiSpendDelta {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly estimatedCostUsd: number;
}

export interface AiSpendRepository {
  getTenantPeriod(
    tenantId: string,
    period: string,
  ): Promise<AiSpendRecord | null>;
  getUserPeriod(
    tenantId: string,
    userId: string,
    period: string,
  ): Promise<AiSpendRecord | null>;
  incrementTenantPeriod(
    tenantId: string,
    period: string,
    delta: AiSpendDelta,
  ): Promise<AiSpendRecord>;
  incrementUserPeriod(
    tenantId: string,
    userId: string,
    period: string,
    delta: AiSpendDelta,
  ): Promise<AiSpendRecord>;
}

export function emptyAiSpendCounters(): AiSpendCounters {
  return {
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
  };
}
