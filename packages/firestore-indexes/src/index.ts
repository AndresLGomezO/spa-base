export type {
  FirestoreCompositeIndex,
  FirestoreFieldOverride,
  FirestoreIndexField,
  FirestoreIndexesFile,
} from "./types.js";
export {
  collectFilterableFields,
  collectSortableFields,
} from "./index-field-sets.js";
export {
  buildFindByFieldIndex,
  buildListQueryIndex,
  buildOwnershipCreatedAtIndex,
  buildOwnershipFkIndex,
  buildOwnershipListIndex,
  computeIndexSignature,
  dedupeIndexes,
  indexesForEntities,
  indexesForEntity,
  resolveEntityCollection,
} from "./build-indexes.js";
export type {
  EntityIndexPlan,
  EntityIndexPlanSummary,
  IndexMatchQuery,
  TenantIndexPlan,
} from "./index-plan.js";
export {
  emptyIndexPlanSummary,
  indexForQueryShape,
  matchesPlannedIndex,
  mergeIndexPlanSummaries,
  planIndexesForEntity,
  planIndexesForTenant,
  plannedIndexSignatures,
} from "./index-plan.js";
