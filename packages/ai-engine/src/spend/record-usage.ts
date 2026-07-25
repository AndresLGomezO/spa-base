import type { AiJobModelUsage } from "../schemas/ai-job.schema.js";
import { aiSpendPeriodKey } from "./period.js";
import type { AiSpendRepository } from "./storage.js";
import { isAttributableAiUserId, spendDeltaFromModelUsage } from "./usage.js";

export async function recordAiSpendUsage(
  repository: AiSpendRepository,
  input: {
    readonly tenantId: string;
    readonly requestedBy: string;
    readonly modelUsage: AiJobModelUsage;
    readonly now?: () => Date;
  },
): Promise<void> {
  const delta = spendDeltaFromModelUsage(input.modelUsage);
  if (!delta) return;

  const period = aiSpendPeriodKey(input.now?.() ?? new Date());
  await repository.incrementTenantPeriod(input.tenantId, period, delta);

  if (isAttributableAiUserId(input.requestedBy)) {
    await repository.incrementUserPeriod(
      input.tenantId,
      input.requestedBy.trim(),
      period,
      delta,
    );
  }
}
