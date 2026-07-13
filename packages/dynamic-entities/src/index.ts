export { applyDescription } from "./apply-description.js";
export { applyHiddenFromNav } from "./apply-hidden-from-nav.js";
export { applyEmailMatchingEnabled } from "./apply-email-matching-enabled.js";
export { applyNavCategoryId, applyNavOrder } from "./apply-nav-assignment.js";
export { applyTenantWideRead } from "./apply-tenant-wide-read.js";
export { applyInMemoryListQueries } from "./apply-in-memory-list-queries.js";
export {
  canIncludeEntityInCatalog,
  INTERNAL_ENTITY_PERMISSIONS,
  INTERNAL_ENTITY_READ_PERMISSION,
} from "./catalog-visibility.js";
export {
  applyDisplayFieldToRecord,
  displayFieldForCreate,
} from "./apply-display-field-patch.js";
export {
  assertNavCategoryExists,
  type NavCategoryReader,
} from "./validate-nav-category.js";
export {
  assertDynamicNameAvailable,
  buildDefaultUiForNewDefinition,
  defineEntityFromRecord,
  DynamicEntityError,
  getAvailableEntityNamesForTenant,
  validateDefinitionEvolution,
  validateRelationTargets,
} from "./define-entity-from-record.js";
export { syncEntityDefinitionUiWithFields } from "./sync-entity-definition-ui.js";
export {
  clearDynamicEntityRegistry,
  clearDynamicEntitiesForTenant,
  getDynamicEntitiesForTenant,
  getDynamicPermissionsForTenant,
  getEntitiesForTenant,
  getDynamicEntity,
  hydrateDynamicEntities,
  isDynamicEntityName,
  registerDynamicEntity,
  resolveEntity,
  unregisterDynamicEntity,
} from "./registry.js";
export {
  createEntityDefinitionInputSchema,
  ENTITY_DEFINITION_PERMISSIONS,
  ENTITY_DEFINITIONS_COLLECTION,
  entityDefinitionRecordSchema,
  fieldDefinitionSchema,
  patchEntityDefinitionInputSchema,
  relationDefinitionSchema,
  type CreateEntityDefinitionInput,
  type EntityDefinitionRecord,
  type FieldDefinitionRecord,
  type PatchEntityDefinitionInput,
} from "./types.js";
export {
  computeCatalogReplacePlan,
  computeCategoryReplacePlan,
  createEntityDefinitionEnvelope,
  createEntityDefinitionsCatalogEnvelope,
  createFieldDefinitionEnvelope,
  ENTITY_DEFINITION_JSON_KIND,
  ENTITY_DEFINITION_JSON_VERSION,
  ENTITY_DEFINITIONS_CATALOG_JSON_KIND,
  FIELD_DEFINITION_JSON_KIND,
  parseEntityDefinitionJson,
  parseEntityDefinitionsCatalogJson,
  parseFieldDefinitionJson,
  portableEntityCategorySchema,
  toPortableEntityCategory,
  toPortableEntityDefinition,
  validateCatalogCategoryDeleteSafety,
  validateCatalogDeleteSafety,
  validateEntityDefinitionImport,
  validateEntityDefinitionsCatalogImport,
  validateEntityDefinitionsCatalogEnvelope,
  validateFieldDefinitionImport,
  type CatalogReplacePlan,
  type CategoryReplacePlan,
  type EntityCategoryLike,
  type EntityDefinitionFormData,
  type EntityDefinitionJsonError,
  type EntityDefinitionsCatalogEnvelope,
  type PortableEntityCategory,
} from "./entity-definition-json.js";
