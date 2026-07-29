export {
  applyRbacFilters,
  assertQueryReadPermission,
} from "./apply-query-security.js";
export type { RbacQueryInjector } from "./apply-query-security.js";
export { createQueryEngine } from "./create-query-engine.js";
export type { QueryEngine, QueryEngineDeps } from "./create-query-engine.js";
export { QueryError, QueryErrorCode } from "./errors.js";
export { applySelectProjection } from "./format-results.js";
export { applyPostFilters, computeOverfetchLimit } from "./post-filters.js";
export {
  applyPostFilterTree,
  evaluateFilterTree,
  enforceFirestoreConstraintsOnTree,
  mergeFilterTrees,
  partitionFilterTree,
  treeRequiresInMemoryExecution,
} from "./filter-tree.js";
export type {
  EnforcedSortConstraints,
  QueryExecutionMode,
} from "./filter-tree.js";
export { rewritePeriodEqualityInTree } from "./period-equality-rewrite.js";
export {
  migrateFlatFiltersToTree,
  normalizeLegacyQueryFilter,
} from "@repo/firestore-converters/filter-tree";
export { decodeCursor, encodeCursor } from "./cursor.js";
export {
  normalizeEntityQuery,
  parseListQueryInput,
  resolveSearchField,
} from "./parse-query-config.js";
export type { ParseListQueryOptions } from "./parse-query-config.js";
export type {
  Filter,
  ListQueryInput,
  QueryConfig,
  QueryContext,
  QueryResult,
  RelationIncludeResolver,
  Sort,
} from "./types.js";
