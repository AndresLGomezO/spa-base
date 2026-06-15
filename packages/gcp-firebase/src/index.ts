export { FirebaseRuntimeEnvSchema, type FirebaseRuntimeEnv } from "./env.js";
export {
  FieldValue,
  getFirestoreAdmin,
  initializeFirebaseAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
export {
  getFirebaseUserRecord,
  setFirebaseUserCustomClaims,
  verifyFirebaseIdToken,
} from "./auth.js";
export { verifyFirebaseAppCheckToken } from "./app-check.js";
export { createFirestoreAdminEntityRepository } from "./firestore-admin-entity-repository.js";
export { createFirestoreEntityQueryExecutor } from "./firestore-entity-query-executor.js";
export type { FirestoreIndexHint } from "./firestore-entity-query-executor.js";
export {
  buildIndexFromHint,
  ensureEntityFirestoreIndexes,
  ensureFirestoreIndexes,
  scheduleEnsureEntityFirestoreIndexes,
  scheduleEnsureFirestoreIndexesFromHint,
} from "./firestore-index-provisioner.js";
export type { FirestoreCompositeIndex } from "@repo/firestore-indexes";
export {
  createFirestoreIndexStatusStore,
  INDEX_STATUS_COLLECTION,
  type FirestoreIndexStatusStore,
  type IndexProvisioningStatus,
  type IndexStatusRecord,
} from "./firestore-index-status.js";
export {
  summarizeIndexProvisioningStatus,
  type IndexProvisioningPhase,
  type IndexProvisioningStatusSummary,
} from "./index-provisioning-phase.js";
export {
  INDEX_PROVISIONING_TOPIC,
  publishIndexProvisioningMessage,
  type IndexProvisioningMessage,
} from "./firestore-index-pubsub.js";
export {
  adminIndexToComposite,
  computeDesiredIndexesFromRepository,
  deleteFirestoreIndex,
  listAllTenantIds,
  listCompositeIndexes,
  pickIndexesToDelete,
  reconcileIndexesForDefinitionChange,
  scheduleReconcileIndexesForDefinitionChange,
  type ListedFirestoreIndex,
  type ReconcileDefinitionChangeOptions,
} from "./firestore-index-reconciler.js";
export { createFirestoreAdminJoinCollectionRepository } from "./firestore-admin-join-collection-repository.js";
export { createFirestoreAdminPlatformRoleRepository } from "./firestore-admin-platform-role-repository.js";
export { createFirestoreAdminTenantRepository } from "./firestore-admin-tenant-repository.js";
export { createFirestoreAdminEntityDefinitionRepository } from "./firestore-admin-entity-definition-repository.js";
export { createFirestoreAdminEntityUiOverrideRepository } from "./firestore-admin-entity-ui-override-repository.js";
export { createFirestoreAdminUiBuilderPresetRepository } from "./firestore-admin-ui-builder-preset-repository.js";
export { createFirestoreAdminTenantDashboardLayoutRepository } from "./firestore-admin-tenant-dashboard-layout-repository.js";
export { createFirestoreAdminHookRepository } from "./firestore-admin-hook-repository.js";
export { createFirestoreAdminMetricDefinitionRepository } from "./firestore-admin-metric-definition-repository.js";
export { createFirestoreAdminAggregationEventRepository } from "./firestore-admin-aggregation-event-repository.js";
export { createFirestoreAdminMetricValueRepository } from "./firestore-admin-metric-value-repository.js";
export { createFirestoreAdminMetricContributionRepository } from "./firestore-admin-metric-contribution-repository.js";
export { createFirestoreAdminBackfillJobRepository } from "./firestore-admin-backfill-job-repository.js";
export { createFirestoreAdminAiJobRepository } from "./firestore-admin-ai-job-repository.js";
export { createFirestoreAdminUiBuilderAiSuggestionRepository } from "./firestore-admin-ui-builder-ai-suggestion-repository.js";
export { createFirestoreAdminTenantAiContextRepository } from "./firestore-admin-tenant-ai-context-repository.js";
export {
  AGGREGATION_EVENTS_TOPIC,
  ensureAggregationEventsTopic,
  publishAggregationEventMessage,
} from "./firestore-aggregation-pubsub.js";
export { createFirestoreAdminEntityCategoryRepository } from "./firestore-admin-entity-category-repository.js";
export { createFirestoreAdminTenantRoleRepository } from "./firestore-admin-tenant-role-repository.js";
export {
  createFirestoreAdminRegisteredUserRepository,
  mapFirebaseUserRecordToAuthUserProjection,
} from "./firestore-admin-user-repository.js";
export {
  createFirestoreAdminTenantUserInviteRepository,
  TENANT_USER_INVITES_SUBCOLLECTION,
} from "./firestore-admin-tenant-user-invite-repository.js";
export {
  uploadTenantLogo,
  uploadTenantDashboardImage,
  validateStorageObjectId,
} from "./tenant-storage.js";
export {
  downloadAiUiRenderImage,
  uploadAiUiRenderImage,
  type UploadAiUiRenderImageResult,
} from "./ai-render-storage.js";
export {
  buildInMemoryListSnapshotCacheKey,
  buildInMemoryListSnapshotInvalidationPrefix,
  buildOwnershipScope,
  createInMemoryListSnapshotCache,
  type InMemoryListSnapshotCache,
} from "./in-memory-list-snapshot-cache.js";
export {
  usesInMemoryListPipeline,
  shouldExecuteInMemoryListQuery,
} from "./query-index-match.js";
export {
  buildFieldDefaultEntityFileObjectId,
  createEntityFileDownloadUrl,
  createStableEntityFileObjectId,
  generateEntityFileObjectId,
  uploadEntityFile,
  validateEntityFileContentType,
  type EntityFileFieldType,
} from "./entity-file-storage.js";
