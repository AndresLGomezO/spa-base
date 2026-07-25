import { z } from "zod";

/** Shared monthly AI spend / token caps (tenant or role). Unset = unlimited. */
export const aiSpendLimitsSchema = z
  .object({
    monthlyInputTokens: z.number().int().nonnegative().optional(),
    monthlyOutputTokens: z.number().int().nonnegative().optional(),
    monthlyBudgetUsd: z.number().nonnegative().optional(),
  })
  .strict();

export type AiSpendLimits = z.infer<typeof aiSpendLimitsSchema>;

export function isAiSpendLimitsEmpty(
  limits: AiSpendLimits | null | undefined,
): boolean {
  if (!limits) return true;
  return (
    limits.monthlyInputTokens == null &&
    limits.monthlyOutputTokens == null &&
    limits.monthlyBudgetUsd == null
  );
}
