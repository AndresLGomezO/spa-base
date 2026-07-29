export {
  type EntityCreateOptions,
  type FindByFieldParams,
  type ListParams,
  type PaginatedResult,
  type TenantScopedEntityRepository,
} from "./entity/tenant-scoped-repository-contract.js";
export {
  type EntityQueryExecutionMode,
  type EntityQueryExecutor,
  type FilterOperator,
  type FirestoreNativeOperator,
  type PostFilterOperator,
  POST_FILTER_OPERATORS,
  isPostFilterOperator,
  type NormalizedEntityQuery,
  type NormalizedFilter,
  type NormalizedSort,
} from "./entity/entity-query-contract.js";
export { makeNormalizedEntityQuery } from "./entity/make-normalized-entity-query.js";
export {
  MAX_FILTER_TREE_DEPTH,
  MAX_OR_DISJUNCTIONS,
  type FilterCombinator,
  type FilterCondition,
  type FilterGroup,
  type FilterNode,
  type NormalizedFilterCondition,
  type NormalizedFilterGroup,
  type NormalizedFilterNode,
  createEmptyAndGroup,
  countOrDisjunctions,
  flattenAndConditions,
  isEmptyFilterTree,
  isFilterCondition,
  isFilterGroup,
  maxTreeDepth,
  migrateFlatFiltersToTree,
  normalizeLegacyQueryFilter,
  walkConditions,
} from "./filter-tree.js";
export {
  type FindJoinBySourceParams,
  type FindJoinByTargetParams,
  type JoinCollectionRepository,
  type JoinRecord,
  type LinkJoinParams,
} from "./entity/join-collection-repository-contract.js";
export {
  ConverterError,
  MissingSchemaTransformError,
  MissingSchemaVersionError,
  SchemaValidationError,
  UnsupportedSchemaVersionError,
} from "./core/errors.js";
export { normalizeFirestoreTimestamps } from "./core/timestamps.js";
export {
  createVersionedConverter,
  type SchemaTransform,
  type VersionedConverterConfig,
} from "./core/versioned-converter.js";

export {
  createEntityConverter,
  type EntityConverterEncryptionConfig,
} from "./entity/create-entity-converter.js";
export {
  registeredUserConverter,
  registeredUserCurrentVersion,
} from "./user/schema.latest.js";
export {
  type RegisteredUserListParams,
  type RegisteredUserListResult,
  type RegisteredUserRepository,
  type RegisteredUserUpsertResult,
  type UpdateRegisteredUserAccessInput,
} from "./user/repository-contract.js";
export {
  platformRoleConverter,
  platformRoleCurrentVersion,
} from "./role/schema.latest.js";
export { type PlatformRoleRepository } from "./role/repository-contract.js";
export {
  tenantConverter,
  tenantCurrentVersion,
} from "./tenant/schema.latest.js";
export {
  type CreateTenantInput,
  type TenantRepository,
  type UpdateTenantInput,
} from "./tenant/repository-contract.js";
export { type EntityDefinitionRepository } from "./entity-definition/repository-contract.js";
export { createInMemoryEntityDefinitionRepository } from "./entity-definition/in-memory-repository.js";
export { type EntityUiOverrideRepository } from "./entity-ui-override/repository-contract.js";
export { createInMemoryEntityUiOverrideRepository } from "./entity-ui-override/in-memory-repository.js";
export { type UiBuilderPresetRepository } from "./ui-builder-preset/repository-contract.js";
export { createInMemoryUiBuilderPresetRepository } from "./ui-builder-preset/in-memory-repository.js";
export { type TenantDashboardLayoutRepository } from "./tenant-dashboard-layout/repository-contract.js";
export { createInMemoryTenantDashboardLayoutRepository } from "./tenant-dashboard-layout/in-memory-repository.js";
export { type TenantSidebarLayoutRepository } from "./tenant-sidebar-layout/repository-contract.js";
export { createInMemoryTenantSidebarLayoutRepository } from "./tenant-sidebar-layout/in-memory-repository.js";
export { type DataHookRepository } from "./hook/repository-contract.js";
export { createInMemoryDataHookRepository } from "./hook/in-memory-repository.js";
export {
  type DataHookExecutionRepository,
  type DataHookExecutionActiveCounts,
} from "./hook-execution/repository-contract.js";
export {
  buildHookExecutionNextCursor,
  decodeHookExecutionListCursor,
  encodeHookExecutionListCursor,
} from "./hook-execution/pagination.js";
export type {
  HookExecutionListCursor,
  HookExecutionListPage,
} from "./hook-execution/pagination.js";
export { createInMemoryDataHookExecutionRepository } from "./hook-execution/in-memory-repository.js";
export { createDataHookExecutionRecorder } from "./hook-execution/create-data-hook-execution-recorder.js";
export { summarizeActiveExecutions } from "./hook-execution/summarize-active-executions.js";
export { summarizeHookExecutions } from "./hook-execution/summarize-hook-executions.js";
export type { HookExecutionSummaryRow } from "./hook-execution/summarize-hook-executions.js";
export { type MetricDefinitionRepository } from "./metric-definition/repository-contract.js";
export { createInMemoryMetricDefinitionRepository } from "./metric-definition/in-memory-repository.js";
export { type FormulaDefinitionRepository } from "./formula-definition/repository-contract.js";
export { createInMemoryFormulaDefinitionRepository } from "./formula-definition/in-memory-repository.js";
export { type LocalePackRepository } from "./locale-pack/repository-contract.js";
export { createInMemoryLocalePackRepository } from "./locale-pack/in-memory-repository.js";
export { type EntityQueryDefinitionRepository } from "./entity-query-definition/repository-contract.js";
export { createInMemoryEntityQueryDefinitionRepository } from "./entity-query-definition/in-memory-repository.js";
export { type ChartDefinitionRepository } from "./chart-definition/repository-contract.js";
export { createInMemoryChartDefinitionRepository } from "./chart-definition/in-memory-repository.js";
export { type InsightSurfaceRepository } from "./insight-surface/repository-contract.js";
export { createInMemoryInsightSurfaceRepository } from "./insight-surface/in-memory-repository.js";
export { type CustomViewRepository } from "./custom-view/repository-contract.js";
export { createInMemoryCustomViewRepository } from "./custom-view/in-memory-repository.js";
export { type AggregationEventRepository } from "./aggregation-event/repository-contract.js";
export { createInMemoryAggregationEventRepository } from "./aggregation-event/in-memory-repository.js";
export { type MetricValueRepository } from "./metric-value/repository-contract.js";
export { createInMemoryMetricValueRepository } from "./metric-value/in-memory-repository.js";
export {
  metricContributionRecordSchema,
  type MetricContributionRecord,
  type MetricContributionRepository,
} from "./metric-contribution/repository-contract.js";
export { createInMemoryMetricContributionRepository } from "./metric-contribution/in-memory-repository.js";
export {
  type BackfillJobRepository,
  type BackfillJobRecord,
  type BackfillJobStatus,
  backfillJobRecordSchema,
} from "./backfill-job/repository-contract.js";
export { createInMemoryBackfillJobRepository } from "./backfill-job/in-memory-repository.js";
export {
  type AiJobRepository,
  type AiJobRecord,
  type AiJobStatus,
  aiJobRecordSchema,
} from "./ai-job/repository-contract.js";
export { createInMemoryAiJobRepository } from "./ai-job/in-memory-repository.js";
export {
  DATA_HOOK_AI_CACHE_COLLECTION,
  dataHookAiCacheDocId,
  dataHookAiCacheRecordSchema,
  type DataHookAiCacheRecord,
  type DataHookAiCacheRepository,
} from "./data-hook-ai-cache/repository-contract.js";
export { createInMemoryDataHookAiCacheRepository } from "./data-hook-ai-cache/in-memory-repository.js";
export {
  AI_SPEND_COLLECTION,
  AI_SPEND_USERS_COLLECTION,
  aiSpendRecordSchema,
  type AiSpendDelta,
  type AiSpendRecord,
  type AiSpendRepository,
} from "./ai-spend/repository-contract.js";
export { createInMemoryAiSpendRepository } from "./ai-spend/in-memory-repository.js";
export {
  type UiBuilderAiSuggestionRepository,
  createInMemoryUiBuilderAiSuggestionRepository,
} from "./ui-builder-ai-suggestion/index.js";
export { type EntityCategoryRepository } from "./entity-category/repository-contract.js";
export { createInMemoryEntityCategoryRepository } from "./entity-category/in-memory-repository.js";
export { type TenantRoleRepository } from "./tenant-role/repository-contract.js";
export { createInMemoryTenantRoleRepository } from "./tenant-role/in-memory-repository.js";
export {
  TENANT_USER_INVITES_SUBCOLLECTION,
  tenantUserInviteRecordSchema,
  type TenantUserInviteRepository,
  type TenantUserInviteRecord,
} from "./tenant-user-invite/repository-contract.js";
export { createInMemoryTenantUserInviteRepository } from "./tenant-user-invite/in-memory-repository.js";
export {
  type TenantAiContextRepository,
  type TenantAiContextRecord,
} from "./tenant-ai-context/repository-contract.js";
export { createInMemoryTenantAiContextRepository } from "./tenant-ai-context/in-memory-repository.js";
export {
  USER_AI_MEMORIES_COLLECTION,
  type UserAiMemoryFact,
  type UserAiMemoryRecord,
  type UserAiMemoryRepository,
} from "./user-ai-memory/repository-contract.js";
export { createInMemoryUserAiMemoryRepository } from "./user-ai-memory/in-memory-repository.js";
export {
  AI_CHAT_SESSIONS_COLLECTION,
  type AiChatCitation,
  type AiChatSessionCreateInput,
  type AiChatSessionListByUserOptions,
  type AiChatSessionMessage,
  type AiChatSessionRecord,
  type AiChatSessionRepository,
  type AiChatSessionStatus,
} from "./ai-chat-session/repository-contract.js";
export { createInMemoryAiChatSessionRepository } from "./ai-chat-session/in-memory-repository.js";
export {
  AI_CONTEXT_SECTIONS_COLLECTION,
  type AiContextSectionBlock,
  type AiContextSectionBlockKind,
  type AiContextSectionRecord,
  type AiContextSectionRepository,
  type AiContextSectionScope,
  type AiContextSectionsCatalogEnvelope,
  type CreateAiContextSectionInput,
  type PatchAiContextSectionInput,
} from "./ai-context-section/repository-contract.js";
export { createInMemoryAiContextSectionRepository } from "./ai-context-section/in-memory-repository.js";
export {
  AI_RECORD_SUMMARIES_COLLECTION,
  buildAiRecordSummaryDocId,
  type AiRecordSummaryNarrative,
  type AiRecordSummaryRag,
  type AiRecordSummaryRecord,
  type AiRecordSummaryRepository,
} from "./ai-record-summary/repository-contract.js";
export { createInMemoryAiRecordSummaryRepository } from "./ai-record-summary/in-memory-repository.js";
export {
  createRegisteredUserFromAuthUser,
  mergeRegisteredUserFromAuthUser,
} from "./user/user-mapper.js";
export { type HookLogMessageRepository } from "./hook-log-message/repository-contract.js";
export { createInMemoryHookLogMessageRepository } from "./hook-log-message/in-memory-repository.js";
export {
  type CreateUserNotificationInput,
  type UserNotificationRepository,
  type UserNotificationListCursor,
  type UserNotificationListPage,
  buildUserNotificationNextCursor,
  decodeUserNotificationListCursor,
  encodeUserNotificationListCursor,
} from "./user-notification/repository-contract.js";
export { createInMemoryUserNotificationRepository } from "./user-notification/in-memory-repository.js";
export {
  type PushTokenRepository,
  type PushTokenRecord,
  type UpsertPushTokenInput,
} from "./push-token/repository-contract.js";
export {
  createInMemoryPushTokenRepository,
  pushTokenDocumentId,
} from "./push-token/in-memory-repository.js";
export { type RequestPerfLogRepository } from "./request-perf-log/repository-contract.js";
export { createInMemoryRequestPerfLogRepository } from "./request-perf-log/in-memory-repository.js";
export { type IndexProvisionEventRepository } from "./index-provision-event/repository-contract.js";
export { createInMemoryIndexProvisionEventRepository } from "./index-provision-event/in-memory-repository.js";
export { type AuditLogRepository } from "./audit-log/repository-contract.js";
export { createInMemoryAuditLogRepository } from "./audit-log/in-memory-repository.js";
export {
  isIsoWithinTimeRange,
  type ListRecentTimeRangeOptions,
} from "./list-recent-time-range.js";
export { type PlatformRuntimeSettingsRepository } from "./platform-runtime-settings/repository-contract.js";
export { createInMemoryPlatformRuntimeSettingsRepository } from "./platform-runtime-settings/in-memory-repository.js";
export {
  type CreateTenantDeletionArchiveInput,
  type CreateTenantDeletionJobInput,
  type TenantDeletionArchiveRepository,
  type TenantDeletionJobRepository,
  tenantDeletionArchiveRecordSchema,
  tenantDeletionJobRecordSchema,
  type TenantDeletionArchiveRecord,
  type TenantDeletionArchiveStats,
  type TenantDeletionArchiveStatus,
  type TenantDeletionJobProgress,
  type TenantDeletionJobRecord,
  type TenantDeletionJobStatus,
} from "./tenant-deletion/repository-contract.js";
export {
  createInMemoryTenantDeletionArchiveRepository,
  createInMemoryTenantDeletionJobRepository,
} from "./tenant-deletion/in-memory-repository.js";
