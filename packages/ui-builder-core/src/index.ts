export type {
  UiLayoutDocument,
  LayoutRootNode,
  ColumnNode,
  RowNode,
  ComponentRowNode,
  NestedLayoutRowNode,
  LayoutAlign,
  ColumnStackDirection,
} from "./types/layout.js";

export { resolveColumnStackDirection } from "./types/layout.js";
export {
  resolveColumnWidthPercents,
  buildGridTemplateColumnsFromPercents,
} from "./layout/resolve-column-width-percents.js";

export type {
  UiComponentConfig,
  UiComponentKind,
  DataSource,
  FieldUiComponentConfig,
  MetricKpiComponentConfig,
  MetricBindingSource,
  TextComponentConfig,
  ImageComponentConfig,
  DateComponentConfig,
  NumericComponentConfig,
  BadgeComponentConfig,
  FieldDateDisplayFormat,
  NumericDisplayFormat,
  CardBadgeVariant,
} from "./types/component.js";

export {
  isMetricKpiComponent,
  isFieldUiComponent,
  isPageUiComponent,
} from "./types/component.js";
export { createDefaultMainPageLayout } from "./layout/default-main-page-layout.js";
export { createDefaultFormLayout } from "./layout/default-form-layout.js";
export {
  createDefaultWizardShellLayout,
  createDefaultWizardStepLayout,
  createDefaultWizardFormConfig,
} from "./layout/default-wizard-form-layout.js";
export {
  assertWizardShellLayout,
  collectLayoutComponentKinds,
  ensureWizardShellLayout,
  createWizardShellLayoutWithSlots,
} from "./layout/wizard-shell.js";
export type {
  WizardProgressComponentConfig,
  WizardStepHostComponentConfig,
  WizardActionsComponentConfig,
  WizardStepStatusKind,
} from "./types/component.js";
export { isWizardUiComponent } from "./types/component.js";
export type { DesignSurface } from "./types/design-surface.js";
export {
  componentKindsForSurface,
  isComponentKindAllowedOnSurface,
} from "./types/design-surface.js";

export type {
  MotionPreset,
  MotionEntrance,
  MotionHover,
  MotionTransition,
} from "./types/motion.js";
export { MOTION_DURATION_MAX_MS } from "./types/motion.js";
export { motionPresetSchema } from "./schema/motion-schema.js";

export type {
  LabelConfig,
  LabelPosition,
  TextColorToken,
  ConditionalStyleRule,
} from "./types/styling.js";

export type {
  StyleRule,
  StylePropertyKey,
  ThemeToken,
} from "./styles/style-types.js";
export { STYLE_PROPERTY_OPTIONS } from "./styles/style-types.js";
export {
  applyStyleRules,
  resolveStyleRules,
  resolvePageSlotWrapper,
  spacingStyleFromStyleRules,
  layoutInlineStyleFromStyleRules,
  type LayoutInlineStyle,
  SPACING_STYLE_PROPERTIES,
  splitStyleRuleClasses,
  type ResolvedStyleRules,
  type SpacingInlineStyle,
  parseFlexLayoutFromStyles,
  componentSlotWrapperClassName,
  gapPxFromStyles,
  fontSizePxFromStyles,
  FONT_SIZE_STYLE_PROPERTY,
  FLEX_LAYOUT_PROPERTIES,
  LAYOUT_CONTAINER_PROPERTIES,
  type SplitStyleRuleClasses,
  type FlexLayoutFromStyles,
  type FlexAlign,
  type FlexJustify,
} from "./styles/apply-style-rules.js";
export {
  resolveMetricKpiPresentation,
  type MetricKpiPresentation,
} from "./styles/resolve-metric-kpi-presentation.js";

export {
  matchConditionalStyles,
  conditionalRulesToBadgeVariants,
  type MatchedConditionalStyles,
} from "./conditions/match-conditional-styles.js";

export {
  listDataSourcePaths,
  resolveStaticDataSource,
  resolveFieldChain,
  isGenericFieldValuePresent,
  type ResolvedFieldChain,
  type ResolveFieldChainOptions,
} from "./resolver/data-source.js";

export {
  isValidLayoutFieldPath,
  isValidFormFieldPath,
  assertLayoutFieldPaths,
  assertFormLayoutFieldPaths,
  collectLayoutFieldPaths,
  listLayoutFieldOptions,
  listFormFieldOptions,
  type ListLayoutFieldOptionsParams,
  formatFieldPathLabel,
  relationAliasFieldPath,
  type FieldPathValidationDefinition,
} from "./validation/field-paths.js";

export { styleRuleSchema } from "./schema/ui-layout-schema.js";
export {
  uiLayoutDocumentSchema,
  type UiLayoutDocumentInput,
} from "./schema/ui-layout-schema.js";

export { createLayoutId } from "./builder/id.js";

export {
  createDefaultComponent,
  createEmptyColumn,
  createEmptyLayout,
  setRootColumnCount,
  setRootColumnWidthPercent,
  moveRootColumn,
  removeRootColumn,
  setNestedColumnCount,
  setNestedColumnWidthPercent,
  moveNestedColumn,
  removeNestedColumn,
  updateRootColumnStyles,
  updateNestedColumnStyles,
  updateRootColumnStackDirection,
  updateNestedColumnStackDirection,
  addComponentRow,
  addNestedLayoutRow,
  updateComponentRow,
  removeRow,
  moveRow,
  updateLayoutMeta,
  normalizeLayout,
  addComponentRowAt,
  addNestedLayoutRowAt,
  removeRowAt,
  moveRowAt,
  updateComponentRowAt,
  updateComponentRowMetaAt,
  MAX_ROOT_COLUMNS,
  MAX_NESTED_COLUMNS,
  type RowLocator,
} from "./builder/mutations.js";

export {
  createDefaultUiLayout,
  createAccountCardSeedLayout,
} from "./builder/defaults.js";
export { createDefaultTableCellLayout } from "./builder/table-cell-defaults.js";
