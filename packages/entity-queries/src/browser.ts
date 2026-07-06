/**
 * Browser-safe entry point for @repo/entity-queries.
 */
export {
  ENTITY_QUERY_DEFINITION_STATUSES,
  ENTITY_QUERY_LIMIT_MODES,
  ENTITY_QUERY_FILTER_OPERATORS,
  ENTITY_QUERY_TEMPORAL_PRESETS,
  EMPTY_ENTITY_QUERY_FILTER,
  entityQueryFilterValueSchema,
  entityQueryFilterSchema,
  entityQueryFilterConditionSchema,
  entityQueryFilterNodeSchema,
  entityQueryFilterGroupSchema,
  entityQuerySortSchema,
  createEntityQueryDefinitionInputSchema,
  patchEntityQueryDefinitionInputSchema,
} from "./types.js";
export type {
  EntityQueryDefinitionStatus,
  EntityQueryLimitMode,
  EntityQueryFilterOperator,
  EntityQueryTemporalPreset,
  EntityQueryFilterValue,
  EntityQueryFilter,
  EntityQueryFilterCondition,
  EntityQueryFilterNode,
  EntityQueryDefinitionFilterRoot,
  EntityQuerySort,
  EntityQueryDefinitionRecord,
  CreateEntityQueryDefinitionInput,
  PatchEntityQueryDefinitionInput,
} from "./types.js";
export { resolveTemporalPreset } from "./temporal.js";
export { compareFilterValues } from "./compare-filter-values.js";
export {
  buildQueryConfigFromDefinition,
  resolveEntityQueryFilterValue,
} from "./build-query-config.js";
export type {
  ResolvedEntityQueryConfig,
  BuildQueryConfigOptions,
} from "./build-query-config.js";
export {
  expandRelationFilters,
  expandRelationFiltersInTree,
  buildExpandedQueryConfig,
  ENTITY_QUERY_NO_MATCH_ID,
  ENTITY_QUERY_RELATION_LIST_MAX_ITEMS,
} from "./expand-relation-filters.js";
export {
  applyRelationSortToItems,
  isRelationSortField,
} from "./expand-relation-sort.js";
export type { ApplyRelationSortInput } from "./expand-relation-sort.js";
export type {
  ExpandRelationFiltersInput,
  ExpandedRelationFiltersResult,
  ExpandRelationFiltersInTreeInput,
  ExpandedRelationFiltersInTreeResult,
} from "./expand-relation-filters.js";
export {
  listQueryableFieldPaths,
  parseQueryableRelationPath,
  resolveQueryableFieldMeta,
  getAllowedOperatorsForFieldMeta,
  getAllowedOperatorsForFieldType,
} from "./relation-field-path.js";
export type {
  EntityCatalogEntry,
  QueryableFieldPathOption,
  QueryableFieldMeta,
  QueryableRelationPath,
} from "./relation-field-path.js";
export { isEntityQueryDefinitionReference } from "./entity-query-reference.js";
export type { EntityQueryDefinitionReference } from "./entity-query-reference.js";
export {
  ENTITY_QUERY_DEFINITION_JSON_VERSION,
  ENTITY_QUERY_DEFINITION_JSON_KIND,
  ENTITY_QUERY_DEFINITIONS_CATALOG_JSON_KIND,
  toPortableEntityQueryDefinition,
  createEntityQueryDefinitionEnvelope,
  createEntityQueryDefinitionsCatalogEnvelope,
  parseEntityQueryDefinitionJson,
  validateEntityQueryDefinitionImport,
  parseEntityQueryDefinitionsCatalogJson,
  validateEntityQueryDefinitionsCatalogImport,
  validateEntityQueryDefinitionsCatalogEnvelope,
  computeCatalogReplacePlan,
} from "./entity-query-definition-json.js";
export type {
  EntityQueryDefinitionJsonError,
  PortableEntityQueryDefinition,
  EntityQueryDefinitionFormData,
  EntityQueryDefinitionsCatalogEnvelope,
  CatalogReplacePlan,
} from "./entity-query-definition-json.js";
