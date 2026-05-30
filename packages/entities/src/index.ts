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
export {
  getForeignKeyRelationFields,
  getJoinCollectionRelations,
  getRelationFields,
  getRelationOnDelete,
  getRelationStorageStrategy,
  resolveJoinCollectionName,
  usesForeignKeyStorage,
  type RelationFieldEntry,
  type RelationStorageStrategy,
} from "./relations/relationConfig.js";
export {
  isDocumentStoredField,
  isDocumentStoredFieldConfig,
  isJoinCollectionRelationField,
} from "./relations/is-document-stored-field.js";
export {
  isOneToManyRelationField,
  resolveOneToManyForeignKeyField,
} from "./relations/resolve-one-to-many-foreign-key.js";
export {
  getDefaultEntityUI,
  getFieldUI,
  resolveEntityUI,
  resolveView,
} from "./ui/default-ui-config.js";
export { serializeEntityDefinition } from "./ui/serialize-entity-definition.js";
export { validateEntityUIConfig } from "./ui/validate-ui-config.js";
export type {
  DetailConfig,
  EntityNavConfig,
  EntityUIConfig,
  FieldComponentType,
  FieldUIConfig,
  FilterOperatorUI,
  FilterUIConfig,
  FormConfig,
  FormLayout,
  FormSection,
  FieldAccessLevel,
  SerializableEntityDefinition,
  SerializableFieldMeta,
  ViewConfig,
} from "./ui/types.js";
export type {
  BooleanFieldConfig,
  DateFieldConfig,
  EnumFieldConfig,
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
  RelationConfig,
  RelationFieldConfig,
  RelationOnDelete,
  RelationType,
  StringFieldConfig,
} from "./types.js";
