/**
 * Public API for @repo/entities.
 * See packages/entities/README.md for integration and extension guidance.
 */
export {
  ARRAY_ELIGIBLE_FIELD_TYPES,
  fieldConfigIsArray,
  isArrayEligibleFieldType,
} from "./array-field-eligibility.js";
export type { ArrayEligibleFieldType } from "./array-field-eligibility.js";
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
  LAYOUT_STATIC_IMAGE_FIELD_NAME,
  findFirstImageFieldName,
  parseLayoutStaticImageRef,
  readLayoutStaticImageUrl,
  resolveLayoutStaticUploadFieldName,
  resolveStaticImageSrc,
  serializeLayoutStaticImageRef,
} from "./layout-static-image.js";
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
export { normalizeArrayFieldValues } from "./search/normalize-array-fields.js";
export {
  applySearchMirrorFields,
  extendEntitySchemaWithSearchMirrors,
  legacySearchMirrorFieldName,
  listLegacySearchMirrorFieldNames,
  listSearchMirrorStorageFields,
  prepareRecordSearchFields,
  resolveSearchStorageField,
  searchMirrorFieldName,
  shouldPersistSearchMirrorFields,
  stripSearchMirrorFields,
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
  metricWidgetBindingsSchema,
} from "./ui/metric-widget-types.js";
export type {
  MetricBindingSource,
  MetricWidgetBindings,
} from "./ui/metric-widget-types.js";
export {
  createDefaultMetricStripLayout,
  DEFAULT_METRIC_STRIP_COLUMN_COUNT,
  metricStripColumnCount,
  metricStripHasContent,
  metricStripLayoutFromView,
} from "./ui/metric-strip-placement.js";
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
  createDefaultTableCellLayout,
  createDefaultMainPageLayout,
  createDefaultFormLayout,
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
  parseEntityUiOverrideRecord,
  putEntityUiOverrideInputSchema,
  safeParseEntityUiOverrideRecord,
  uiOverrideFormsSchema,
  type PutEntityUiOverrideInput,
} from "./ui/entity-ui-override-schema.js";
export {
  createDesignLayoutSliceEnvelope,
  createDesignLayoutSliceSkeleton,
  entityUiConfigToPutOverrideInput,
  parseDesignLayoutSliceJson,
  parsePutEntityUiOverrideJson,
  validateDesignLayoutSlice,
  validatePutEntityUiOverrideInput,
  type DesignLayoutSliceData,
  type DesignLayoutSliceError,
  type DesignLayoutSliceParseResult,
  type DesignLayoutSliceValidationResult,
  type DesignLayoutSurface,
  type FormsSliceData,
  type ListSliceData,
  type MainPageSliceData,
  type MetricStripSliceData,
  type PutEntityUiOverrideParseResult,
  type RecordDetailSliceData,
} from "./ui/design-layout-slice-schema.js";
export {
  fromPersistedUiOverride,
  persistedEntityUiOverrideSchema,
  safeFromPersistedUiOverride,
  toPersistedUiOverride,
  type PersistedEntityUiOverride,
} from "./ui/entity-ui-override-persistence.js";
export {
  ENTITY_UI_OVERRIDE_PERMISSIONS,
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  type EntityUiOverridePermission,
} from "./ui/entity-ui-override-permissions.js";
export {
  UI_BUILDER_PRESETS_COLLECTION,
  uiBuilderPresetRecordSchema,
  createUiBuilderPresetInputSchema,
  updateUiBuilderPresetInputSchema,
  uiBuilderFieldSlotSchema,
  uiBuilderPresetKindSchema,
  type UiBuilderPresetRecord,
  type CreateUiBuilderPresetInput,
  type UpdateUiBuilderPresetInput,
  type UiBuilderFieldSlot,
  type UiBuilderPresetKind,
} from "./ui/ui-builder-preset-schema.js";
export {
  fromPersistedUiBuilderPreset,
  persistedUiBuilderPresetSchema,
  safeFromPersistedUiBuilderPreset,
  toPersistedUiBuilderPreset,
  type PersistedUiBuilderPreset,
} from "./ui/ui-builder-preset-persistence.js";
export {
  mergeEntityUiOverrides,
  mergeEntityViewOverrides,
} from "./ui/merge-entity-ui-overrides.js";
export { normalizeListItemLayout } from "./ui/normalize-list-item-layout.js";
export {
  resolveCreateFormFromLayout,
  resolveEditFormFromUi,
} from "./ui/resolve-form-layout-from-ui.js";
export {
  resolveFormModalSize,
  resolveFormModalChrome,
  resolveEffectiveFormModalContentPadding,
  resolveFormModalFooterLayout,
  resolveFormUsesModalBuilderFooter,
  resolveFormModalActionComponentKind,
  resolveFormModalActionLayout,
  resolveFormModalHasLayoutActions,
  resolveFormPresentation,
  resolvePlainFormLayout,
  resolveWizardForm,
  type ResolvedFormModalChrome,
} from "./ui/resolve-form-config.js";
export type {
  FormPresentation,
  FormModalChrome,
  FormModalContentPadding,
  WizardFormConfig,
  WizardStepConfig,
  WizardStepStatus,
  EntityUiOverrideForms,
} from "./ui/form-config.js";
export { normalizeEntityViews } from "./ui/normalize-entity-views.js";
export {
  createDefaultExpandableTableView,
  expandableTableViewFromListItem,
} from "./ui/expandable-table-defaults.js";
export {
  migrateListPresentation,
  findExpandableTableView,
  type EntityUiConfigWithLegacyPresentation,
} from "./ui/migrate-list-presentation.js";
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
  FormModalSize,
  FormSection,
  FieldAccessLevel,
  SerializableEntityDefinition,
  SerializableFieldMeta,
  ViewConfig,
  ViewConfigBase,
  TableViewConfig,
  CardViewConfig,
  ExpandableTableViewConfig,
  GroupedTableColumn,
  isTableViewConfig,
  isCardViewConfig,
  isExpandableTableViewConfig,
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
