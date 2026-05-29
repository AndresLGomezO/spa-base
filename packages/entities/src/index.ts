/**
 * Public API for @repo/entities.
 * See packages/entities/README.md for integration and extension guidance.
 */
export { defineEntity } from "./defineEntity.js";
export type { FieldTypeRegistry, FieldSchemaBuilder } from "./fieldTypes.js";
export { defaultFieldTypeRegistry } from "./schema/buildFieldSchema.js";
export { isoDatetimeStringSchema } from "./schema/isoDatetime.js";
export {
  clearEntityRegistry,
  getAllEntities,
  getEntity,
  registerEntity,
} from "./registry/entityRegistry.js";
export {
  SYSTEM_FIELD_KEYS,
  SYSTEM_FIELDS,
  type SystemFieldKey,
  type SystemFieldRecord,
} from "./systemFields.js";
export type {
  BooleanFieldConfig,
  DateFieldConfig,
  DefinedEntity,
  EntityConfig,
  EntityMetadata,
  EntityPermission,
  EntityPermissionAction,
  EntityPermissions,
  FieldConfig,
  FieldDefinitions,
  InferCreate,
  InferEntity,
  InferFieldValue,
  InferUpdate,
  NormalizedFieldMeta,
  NumberFieldConfig,
  Phase1FieldType,
  StringFieldConfig,
} from "./types.js";
