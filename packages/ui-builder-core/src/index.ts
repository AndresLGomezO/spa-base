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

export { isMetricKpiComponent } from "./types/component.js";

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
  spacingStyleFromStyleRules,
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
  assertLayoutFieldPaths,
  collectLayoutFieldPaths,
  listLayoutFieldOptions,
  type ListLayoutFieldOptionsParams,
  formatFieldPathLabel,
  relationAliasFieldPath,
  type FieldPathValidationDefinition,
} from "./validation/field-paths.js";

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
  moveRootColumn,
  removeRootColumn,
  setNestedColumnCount,
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
  MAX_ROOT_COLUMNS,
  MAX_NESTED_COLUMNS,
  type RowLocator,
} from "./builder/mutations.js";

export {
  createDefaultUiLayout,
  createAccountCardSeedLayout,
} from "./builder/defaults.js";
