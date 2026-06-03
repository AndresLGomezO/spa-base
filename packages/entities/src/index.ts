/**
 * Public API for @repo/entities.
 * See packages/entities/README.md for integration and extension guidance.
 */
export { defineEntity } from "./defineEntity.js";
export type { FieldTypeRegistry, FieldSchemaBuilder } from "./fieldTypes.js";
export { defaultFieldTypeRegistry } from "./schema/buildFieldSchema.js";
export {
  DEFAULT_DOCUMENT_MAX_SIZE_BYTES,
  DEFAULT_IMAGE_MAX_SIZE_BYTES,
  MAX_ENTITY_FILE_UPLOAD_REQUEST_BODY_BYTES,
  MAX_FILE_SIZE_BYTES_CAP,
  resolveFileFieldMaxSizeBytes,
} from "./schema/file-field-defaults.js";
export {
  isoDatetimeStringSchema,
  isIsoDatetimeString,
} from "./schema/isoDatetime.js";
export {
  DOCUMENT_CONTENT_TYPES,
  IMAGE_CONTENT_TYPES,
  createEntityFileReferenceSchema,
  documentFileReferenceSchema,
  entityFileReferenceSchema,
  imageFileReferenceSchema,
  isEntityFileReference,
  stripDownloadUrlFromFileReference,
} from "./schema/entityFileReference.js";
export type {
  DocumentContentType,
  EntityFileReference,
  EntityFileReferenceWithDownload,
  ImageContentType,
} from "./schema/entityFileReference.js";
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
export {
  applySearchMirrorFields,
  extendEntitySchemaWithSearchMirrors,
  legacySearchMirrorFieldName,
  listLegacySearchMirrorFieldNames,
  listSearchMirrorStorageFields,
  resolveSearchStorageField,
  searchMirrorFieldName,
  tokenizeSearchMirrorValue,
} from "./search/search-mirror-fields.js";
export {
  entityUsesExplicitSearchableFlags,
  isSearchableField,
  listSearchableStringFields,
  resolveSearchField,
} from "./search/searchable-fields.js";
export {
  metricBindingSourceSchema,
  viewMetricWidgetSchema,
} from "./ui/metric-widget-types.js";
export type {
  MetricBindingSource,
  MetricWidgetBindings,
  ViewMetricKpiWidget,
  ViewMetricSeriesWidget,
  ViewMetricWidget,
} from "./ui/metric-widget-types.js";
export type {
  UiLayoutDocument,
  UiComponentConfig,
  UiComponentKind,
  DataSource,
  MetricKpiComponentConfig,
  CardBadgeVariant,
  LabelConfig,
  StyleRule,
} from "@repo/ui-builder-core";
export {
  uiLayoutDocumentSchema,
  createDefaultUiLayout,
  createAccountCardSeedLayout,
  assertLayoutFieldPaths,
  isValidLayoutFieldPath,
  listLayoutFieldOptions,
  formatFieldPathLabel,
  relationAliasFieldPath,
  isMetricKpiComponent,
} from "@repo/ui-builder-core";
export {
  LAYOUT_SPACING_KEYS,
  LAYOUT_SPACING_MAX_PX,
  LAYOUT_SPACING_MIN_PX,
  type LayoutSpacingKey,
} from "./ui/layout-spacing.js";
export {
  ENTITY_UI_OVERRIDES_COLLECTION,
  entityUiOverrideRecordSchema,
  putEntityUiOverrideInputSchema,
  type PutEntityUiOverrideInput,
} from "./ui/entity-ui-override-schema.js";
export {
  ENTITY_UI_OVERRIDE_PERMISSIONS,
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  type EntityUiOverridePermission,
} from "./ui/entity-ui-override-permissions.js";
export { mergeEntityViewOverrides } from "./ui/merge-entity-view-overrides.js";
export { normalizeEntityViews } from "./ui/normalize-entity-views.js";
export type {
  DetailConfig,
  EntityNavConfig,
  EntityUiOverride,
  EntityUiOverrideRecord,
  EntityListViewType,
  EntityUIConfig,
  FieldComponentType,
  FieldDateDisplayFormat,
  FieldDisplayFormat,
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
  ImageFieldConfig,
  DocumentFieldConfig,
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
