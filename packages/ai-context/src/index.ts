export {
  assembleUiBuilderContext,
  UI_BUILDER_SYSTEM_INSTRUCTION,
  type AiContextBlock,
  type AssembledUiBuilderContext,
  type UiBuilderContextInput,
  type UiBuilderContextRequest,
} from "./assembler/assemble-ui-builder-context.js";

export {
  assembleUiBuilderStepContext,
  type AssembledUiBuilderStepContext,
  type UiBuilderStepContextRequest,
} from "./assembler/assemble-ui-builder-step-context.js";

export {
  assembleDataModelContext,
  buildDataModelContext,
  DATA_MODEL_SYSTEM_INSTRUCTION,
} from "./assembler/assemble-data-model-context.js";

export {
  buildThemeContext,
  themeContextSourceHash,
  THEME_TENANT_SNAPSHOT_FRAGMENT_ID,
  type ThemeContextBuildResult,
} from "./builders/build-theme-context.js";

export {
  buildEntityCatalogFragment,
  buildEntityCurrentFragment,
  buildEntityTenantFragment,
  extractCatalogSummaries,
  resolveLayoutFieldPathsForEntity,
  toFieldPathValidationDefinition,
  ENTITY_CATALOG_FRAGMENT_ID,
  ENTITY_CURRENT_FRAGMENT_ID,
  ENTITY_TENANT_FRAGMENT_ID,
  type EntityCatalogBuildInput,
  type EntityCatalogEntitySummary,
  type EntityContextBuildInput,
  type EntityTenantSummaryInput,
} from "./builders/build-entity-context.js";

export {
  buildUiSchemaContext,
  listRegisteredSurfaceFragmentIds,
  resolveAllowedComponentKinds,
  resolveSurfaceFragmentIds,
  type FormPresentation,
  type ListViewType,
  type UiSchemaContextScope,
} from "./builders/build-ui-schema-context.js";

export {
  buildComponentAtomMarkdown,
  componentAtomId,
  COMPONENT_DESCRIPTIONS,
} from "./generate/component-descriptions.js";

export {
  buildSurfaceVariantMarkdown,
  SURFACE_VARIANTS,
  buildAllGeneratedFragments,
} from "./generate/surface-variants.js";

export {
  buildAllModelFragments,
  buildModelEntitySchemaAtom,
  buildModelFieldPropertiesAtom,
  buildModelFieldTypesAtom,
  buildModelFieldUiAtom,
  buildModelFilesAtom,
  buildModelFullExampleAtom,
  buildModelRelationsAtom,
  MODEL_ENTITY_SCHEMA_ATOM_ID,
  MODEL_EXAMPLE_FULL_ATOM_ID,
  MODEL_FIELD_PROPERTIES_ATOM_ID,
  MODEL_FIELD_TYPES_ATOM_ID,
  MODEL_FIELD_UI_ATOM_ID,
  MODEL_FILES_ATOM_ID,
  MODEL_FRAGMENT_IDS,
  MODEL_FRAGMENT_SPECS,
  MODEL_RELATIONS_ATOM_ID,
} from "./generate/model-schema.js";

export {
  getCombinedStaticFragments,
  getGeneratedFragment,
  getModelFragments,
  getStaticAtomFragments,
  type AiContextManifest,
} from "./generated/load-generated.js";

export {
  TENANT_AI_CONTEXTS_COLLECTION,
  tenantAiContextKindSchema,
  tenantAiContextRecordSchema,
  type TenantAiContextKind,
  type TenantAiContextRecord,
  type TenantAiContextRepository,
} from "./storage/tenant-ai-context.schema.js";

export {
  assembleUiBuilderContextForTenant,
  assembleUiBuilderContextFromRecords,
  computeEntityCatalogSourceHash,
  getEntityContextFragments,
  getOrBuildThemeContext,
  syncAllEntityAiContextsForTenant,
  syncTenantEntityAiContexts,
  upsertEntityAiContext,
  upsertEntityCatalogAiContext,
  upsertThemeAiContext,
  type BuildEntityContextsInput,
  type TenantAiContextServiceDeps,
} from "./services/tenant-ai-context.service.js";

export {
  buildTenantAiContextDocId,
  estimateTokenCount,
  hashSourceValue,
  truncateText,
} from "./utils/hash.js";

export {
  buildThemeStyleRulesAtom,
  buildThemeLayoutTokensAtom,
  THEME_LAYOUT_TOKENS_ATOM_ID,
  THEME_STYLE_RULES_ATOM_ID,
} from "./atoms/theme/style-rules.js";

export {
  buildUiDataSourcesAtom,
  buildUiLayoutBaseAtom,
  buildUiStyleRulesAtom,
  UI_DATA_SOURCES_ATOM_ID,
  UI_LAYOUT_BASE_ATOM_ID,
  UI_STYLE_RULES_ATOM_ID,
} from "./atoms/ui/layout-document.js";

export {
  buildUiConditionalStylesAtom,
  componentSupportsConditionalStyles,
  COMPONENTS_WITH_CONDITIONAL_STYLES,
  UI_CONDITIONAL_STYLES_ATOM_ID,
} from "./atoms/ui/conditional-styles.js";

export {
  buildUiLabelConfigAtom,
  componentSupportsLabelConfig,
  UI_LABEL_CONFIG_ATOM_ID,
} from "./atoms/ui/label-config.js";

export {
  buildUiMetricBindingsAtom,
  componentSupportsMetricBindings,
  UI_METRIC_BINDINGS_ATOM_ID,
} from "./atoms/ui/metric-bindings.js";

export { buildUiMotionAtom, UI_MOTION_ATOM_ID } from "./atoms/ui/motion.js";

export {
  buildUiResponsiveVisibilityAtom,
  UI_RESPONSIVE_VISIBILITY_ATOM_ID,
} from "./atoms/ui/responsive-visibility.js";

export {
  buildUiStyleLayersAtom,
  UI_STYLE_LAYERS_ATOM_ID,
} from "./atoms/ui/style-layers.js";

export {
  FORMS_DESIGN_EXCELLENCE_FRAGMENT_ID,
  FORMS_DESIGN_EXCELLENCE_GUIDANCE,
  FORMS_CONTRACT_WIZARD_EXCERPT,
  FORMS_CONTRACT_WIZARD_EXCERPT_FRAGMENT_ID,
} from "./atoms/ui/forms-design-excellence.js";

export {
  FORMS_RENDER_COMPOSE_SYSTEM_INSTRUCTION,
  FORMS_RENDER_MOCKUP_GUIDANCE,
  FORMS_RENDER_MOCKUP_GUIDANCE_FRAGMENT_ID,
  FORMS_RENDER_REFINE_SYSTEM_INSTRUCTION,
} from "./atoms/ui/forms-render-mockup-guidance.js";

export {
  FORMS_RENDER_WIZARD_COMPOSE_SYSTEM_INSTRUCTION,
  FORMS_RENDER_WIZARD_REFINE_SYSTEM_INSTRUCTION,
  FORMS_RENDER_WIZARD_SHELL_GUIDANCE,
  FORMS_RENDER_WIZARD_SHELL_GUIDANCE_FRAGMENT_ID,
} from "./atoms/ui/forms-render-wizard-shell-guidance.js";
