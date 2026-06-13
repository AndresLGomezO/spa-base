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
  resolveMaxColumnWidthPercent,
  resolveColumnWidthPercentInput,
  buildGridTemplateColumnsFromPercents,
} from "./layout/resolve-column-width-percents.js";
export {
  RESPONSIVE_GRID_STYLE_PROPERTIES,
  RESPONSIVE_GRID_TAILWIND_SAFELIST,
  RESPONSIVE_BREAKPOINT_ORDER,
  RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS,
  MAX_GRID_COLUMNS,
  buildAutoFitGridTemplate,
  buildResponsiveGridClassName,
  buildResponsiveGridClassNameAtBreakpoint,
  hasExplicitResponsiveGridColumns,
  parseGridAutoFitMinWidth,
  parseGridResponsiveMode,
  buildAutoDefaultGridCounts,
  buildProportionalGridColsClass,
  buildProportionalResponsiveGridClassName,
  hasExplicitColumnWidthPercents,
  PROPORTIONAL_GRID_TEMPLATE_CLASS,
  resolveResponsiveGridCounts,
  resolveResponsiveGridLayout,
  usesResponsiveGridLayout,
  type ResponsiveGridBreakpoint,
  type ResponsiveGridBreakpointCounts,
  type ResponsiveGridMode,
  type ResolvedResponsiveGridLayout,
  type ResolveResponsiveGridLayoutOptions,
} from "./layout/responsive-grid.js";
export {
  DEFAULT_DISPLAY_FROM,
  DEFAULT_DISPLAY_TO,
  DISPLAY_RANGE_TAILWIND_SAFELIST,
  buildDisplayRangeClassName,
  resolveDisplayRangeVisibility,
  type ResolvedDisplayRangeVisibility,
  isFullDisplayRange,
  isVisibleAtBreakpoint,
  normalizeDisplayRange,
  type BuildDisplayRangeClassNameOptions,
  type NormalizedDisplayRange,
} from "./layout/component-display-range.js";

export type {
  UiComponentConfig,
  UiComponentKind,
  DataSource,
  FieldUiComponentConfig,
  MetricKpiComponentConfig,
  MetricWidgetComponentConfig,
  MetricBindingSource,
  TextComponentConfig,
  ImageComponentConfig,
  DateComponentConfig,
  NumericComponentConfig,
  BadgeComponentConfig,
  IconComponentConfig,
  FormFieldComponentConfig,
  BooleanFieldDisplay,
  SwitchVariant,
  EntityFieldSelectorComponentConfig,
  EntityFieldSelectorLayout,
  FieldDateDisplayFormat,
  NumericDisplayFormat,
  CardBadgeVariant,
} from "./types/component.js";

export {
  isMetricKpiComponent,
  isMetricWidgetComponent,
  isFieldUiComponent,
  isIconComponent,
  isEntityFieldSelectorComponent,
  isPageUiComponent,
} from "./types/component.js";
export { createDefaultMainPageLayout } from "./layout/default-main-page-layout.js";
export { createDefaultFormLayout } from "./layout/default-form-layout.js";
export { createDefaultModalFooterLayout } from "./layout/default-modal-footer-layout.js";
export {
  findLayoutComponent,
  layoutHasComponentKind,
} from "./layout/find-layout-component.js";
export {
  createDefaultWizardShellLayout,
  createDefaultWizardStepLayout,
  createDefaultWizardSummaryStepLayout,
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
  WizardProgressVariant,
  WizardStepHostComponentConfig,
  WizardActionsComponentConfig,
  WizardStepLabelConfig,
  WizardStepLabelPosition,
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
  isCssColorValue,
  isCustomColorValue,
  isThemeTokenValue,
} from "./styles/color-values.js";
export {
  resolveBackgroundComponentColor,
  resolveTextComponentColor,
  type ResolvedBackgroundColor,
  type ResolvedTextColor,
} from "./styles/resolve-component-color.js";
export {
  applyStyleRules,
  resolveStyleRules,
  resolvePageSlotWrapper,
  spacingStyleFromStyleRules,
  layoutInlineStyleFromStyleRules,
  textInlineStyleFromStyleRules,
  type LayoutInlineStyle,
  type TextInlineStyle,
  SPACING_STYLE_PROPERTIES,
  splitStyleRuleClasses,
  type ResolvedStyleRules,
  type SpacingInlineStyle,
  parseFlexLayoutFromStyles,
  usesFlexWrapLayout,
  usesTextWrap,
  flexWrapClassFromStyles,
  textWrapClassFromStyles,
  columnFlexBasisStyle,
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
  type FlexWrap,
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
  collectLayoutInputFieldPaths,
  layoutHasInputFields,
  listLayoutFieldOptions,
  listFormFieldOptions,
  listEntityFieldSelectorFieldOptions,
  isValidEntityFieldSelectorFieldPath,
  type ListLayoutFieldOptionsParams,
  formatFieldPathLabel,
  relationAliasFieldPath,
  type FieldPathValidationDefinition,
} from "./validation/field-paths.js";

export {
  validateLayoutJsonImport,
  createLayoutJsonSkeleton,
  type LayoutJsonImportScope,
  type LayoutJsonImportError,
  type LayoutJsonImportValidationResult,
  type ValidateLayoutJsonImportOptions,
} from "./validation/layout-json-import.js";

export {
  regenerateLayoutDocumentIds,
  regenerateComponentRowSubtree,
  regenerateNestedLayoutRowSubtree,
  regenerateColumnSubtree,
} from "./validation/regenerate-layout-ids.js";

export {
  genericizeLayoutNode,
  GenericizeLayoutNodeError,
  type GenericizeLayoutNodeResult,
} from "./presets/genericize-layout-node.js";
export {
  applyPresetSlots,
  type ApplyPresetSlotsResult,
} from "./presets/apply-preset-slots.js";
export {
  type UiBuilderPresetKind,
  type UiBuilderFieldSlot,
  type UiBuilderFieldSlotKind,
  UI_BUILDER_SLOT_TOKEN_PREFIX,
  uiBuilderSlotToken,
  isUiBuilderSlotToken,
  parseUiBuilderSlotToken,
} from "./presets/types.js";

export { styleRuleSchema } from "./schema/ui-layout-schema.js";
export {
  uiLayoutDocumentSchema,
  componentRowSchema,
  nestedLayoutRowSchema,
  columnNodeSchema,
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
  updateRootNodeStyles,
  updateNestedLayoutRowStyles,
  updateNestedLayoutRowDisplayRange,
  updateNestedLayoutRowMetaAt,
  updateNestedColumnStyles,
  updateRootColumnDisplayRange,
  updateNestedColumnDisplayRange,
  replaceNestedColumnAt,
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
  insertRowAt,
  insertComponentRowAt,
  insertNestedLayoutRowAt,
  type RowInsertPosition,
  removeRowAt,
  moveRowAt,
  updateComponentRowAt,
  updateComponentRowMetaAt,
  replaceLayoutDocument,
  replaceComponentRowAt,
  replaceNestedLayoutRowAt,
  insertColumnAt,
  appendComponentRowAt,
  appendNestedLayoutRowAt,
  MAX_ROOT_COLUMNS,
  MAX_NESTED_COLUMNS,
  type RowLocator,
} from "./builder/mutations.js";

export {
  createDefaultUiLayout,
  createAccountCardSeedLayout,
} from "./builder/defaults.js";
export { createDefaultTableCellLayout } from "./builder/table-cell-defaults.js";
export {
  createDefaultRowExpandLayout,
  ensureRowExpandNestedRootLayout,
  isRowExpandNestedRootLayout,
} from "./builder/row-expand-defaults.js";
export {
  createDefaultListCardLayout,
  ensureListCardNestedRootLayout,
  isListCardNestedRootLayout,
} from "./builder/list-card-defaults.js";
