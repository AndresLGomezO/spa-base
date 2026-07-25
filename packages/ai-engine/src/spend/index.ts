export { AiSpendLimitError } from "./errors.js";
export {
  assertAiSpendAllowed,
  evaluateAiSpend,
  type AssertAiSpendAllowedInput,
} from "./assert-ai-spend-allowed.js";
export {
  findExhaustedMeter,
  isMeterExhausted,
  isSoftWarnRemaining,
  mergeStrictestAiSpendLimits,
  minOptional,
  remainingForMeter,
  type AiSpendBlockReason,
  type AiSpendMeter,
  type AiSpendScope,
} from "./limits.js";
export {
  aiSpendPeriodKey,
  tenantAiSpendDocId,
  userAiSpendDocId,
} from "./period.js";
export { recordAiSpendUsage } from "./record-usage.js";
export { resolveRoleAiSpendLimits } from "./resolve-role-limits.js";
export type { RoleAiSpendLimitsSource } from "./resolve-role-limits.js";
export {
  buildAiSpendStatus,
  type AiSpendBucketStatus,
  type AiSpendStatus,
} from "./status.js";
export {
  AI_SPEND_COLLECTION,
  AI_SPEND_USERS_COLLECTION,
  aiSpendCountersSchema,
  aiSpendRecordSchema,
  emptyAiSpendCounters,
  type AiSpendCounters,
  type AiSpendDelta,
  type AiSpendRecord,
  type AiSpendRepository,
} from "./storage.js";
export { isAttributableAiUserId, spendDeltaFromModelUsage } from "./usage.js";
