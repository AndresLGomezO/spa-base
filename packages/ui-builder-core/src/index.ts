export type {
  UiLayoutDocument,
  LayoutRootNode,
  ScreenRootNode,
  ColumnNode,
  RowNode,
  ComponentRowNode,
  LayoutAlign,
  ColumnStackDirection,
} from "./types/layout.js";

export type { ComponentClickAction } from "./types/click-action.js";
export type {
  EntityFormPrefillMapping,
  EntityFormPrefillSource,
  EntityNavigationTarget,
  EntityViewKind,
  ResolvedComponentClickTarget,
} from "./types/click-action.js";
export {
  isEntityNavigationTargetCurrent,
  readEntityNavigationEntityName,
  readEntityNavigationRelationFieldPath,
  normalizeEntityClickAction,
} from "./types/click-action.js";

export { resolveColumnStackDirection } from "./types/layout.js";
export { isScreenRootNode, isLayoutRootNode } from "./types/layout.js";
export {
  resolveColumnWidthPercents,
  resolveMaxColumnWidthPercent,
  resolveColumnWidthPercentInput,
  buildGridTemplateColumnsFromPercents,
} from "./layout/resolve-column-width-percents.js";
export {
  analyzeGridTemplateColumns,
  normalizeGridTemplateColumnsForCss,
  type AnalyzeGridTemplateColumnsOptions,
  type GridTemplateColumnsAnalysis,
  type GridTemplateColumnsAnalysisFailure,
  type GridTemplateColumnsAnalysisSuccess,
  type GridTemplateColumnsErrorCode,
  countDefinedGridTemplateTracks,
} from "./layout/parse-grid-template-columns.js";
export { migrateViewSearchFilterLayout } from "./layout/migrate-view-search-filter-layout.js";
export { resolveComponentBoundFieldPath } from "./layout/resolve-component-bound-field-path.js";
export {
  defaultDateFilterParam,
  resolveDashboardDateFilterConfig,
  resolveDateFilterGranularity,
  resolveDateFilterParam,
  type DashboardDateFilterConfig,
} from "./view-filter/date-filter-config.js";
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
  MetricDerivedKpiComponentConfig,
  MetricDerivedTerm,
  MetricDerivedExpressionToken,
  MetricDerivedOperator,
  MetricWidgetComponentConfig,
  DashboardSectionComponentConfig,
  ViewSearchComponentConfig,
  ViewFilterComponentConfig,
  ViewFilterDateGranularity,
  ViewFilterEntry,
  ViewFilterUiComponentConfig,
  MetricBindingSource,
  TextComponentConfig,
  ImageComponentConfig,
  DateComponentConfig,
  NumericComponentConfig,
  BadgeComponentConfig,
  IconComponentConfig,
  UserComponentConfig,
  UserDisplayMode,
  UserNameFormat,
  ContainerComponentConfig,
  GridComponentConfig,
  QueryViewerComponentConfig,
  RowHolderComponentConfig,
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
  isMetricDerivedKpiComponent,
  isMetricWidgetComponent,
  isDashboardSectionComponent,
  isViewSearchComponent,
  isViewFilterComponent,
  isFieldUiComponent,
  isIconComponent,
  isUserComponent,
  isContainerComponent,
  isGridComponent,
  isQueryViewerComponent,
  isRowHolderComponent,
  isEntityFieldSelectorComponent,
  isPageUiComponent,
} from "./types/component.js";
export { createDefaultMainPageLayout } from "./layout/default-main-page-layout.js";
export {
  ensureContainerRoot,
  resolveRootContainer,
  isRootContainerRow,
  resolveRootContainerRows,
  resolveRootContainerLocator,
  beginContainerRootLayout,
} from "./layout/ensure-container-root.js";
export {
  ensureStandardRoot,
  createDefaultLayoutDocument,
  createDefaultScreenRootLayout,
  resolveDocumentRootKind,
  migrateLayoutToSection15,
} from "./layout/ensure-standard-root.js";
export {
  migrateContainerLayoutToGrid,
  migrateNestedLayoutsInDocument,
  createScreenRootNode,
  ensureScreenRootDocument,
  layoutRootToScreenRoot,
} from "./layout/migrate-to-grid.js";
export {
  asEditableLayoutRoot,
  toEditableLayoutRoot,
  toEditableLayoutDocument,
  fromEditableLayoutDocument,
  resolveLayoutRootColumns,
  withEditableRootColumns,
} from "./layout/layout-root-adapters.js";
export type { CompositionScope, RootNodeKind } from "./types/composition.js";
export {
  COMPOSITION_SCOPES,
  resolveRootNodeKind,
} from "./types/composition.js";
export type {
  PreviewContextConfig,
  PreviewContextConstraints,
  PreviewContextControls,
  PreviewWidthConstraint,
  PreviewHeightConstraint,
} from "./types/preview-context.js";
export {
  DEFAULT_PREVIEW_WIDTH_PX,
  MIN_PREVIEW_WIDTH_PX,
  MAX_PREVIEW_WIDTH_PX,
  createPreviewContextConfig,
  resolvePreviewContextControls,
  resolvePreviewContextConstraints,
} from "./types/preview-context.js";
export type {
  PreviewDevice,
  PreviewStrategy,
} from "./types/preview-strategy.js";
export {
  FULL_DEVICE_SET,
  MOBILE_DESKTOP_DEVICE_SET,
  FULL_DEVICE_STRATEGY,
  MOBILE_DESKTOP_STRATEGY,
  WIDGET_WIDTH_STRATEGY,
  SECTION_WIDTH_STRATEGY,
  FORM_WIDTH_STRATEGY,
  resolvePreviewStrategy,
  resolvePreviewStrategyFromScope,
} from "./types/preview-strategy-map.js";
export {
  resolveCompositionScope,
  isScreenScope,
} from "./types/composition-scope.js";
export type { LayoutProps, StyleProps } from "./types/layout-props.js";
export {
  LAYOUT_STYLE_PROPERTIES,
  isLayoutStyleProperty,
  filterLayoutStyleRules,
  filterVisualStyleRules,
  readGridGapEditorValue,
  stripGapStyleRules,
} from "./types/layout-props.js";
export {
  validateStyleProps,
  sanitizeStyleProps,
  StylePropsValidationError,
} from "./validation/validate-style-props.js";
export { resolveTemplatePlaceholders } from "./presets/resolve-template-placeholders.js";
export {
  BUILT_IN_TEMPLATE_DEFINITIONS,
  type BuiltInComponentTemplate,
  type BuiltInComponentTemplateDefinition,
  type BuiltInComponentTemplateId,
} from "./presets/built-in-component-templates.js";
export {
  applyBuiltInTemplate,
  deriveListPresentationFromLayout,
  getBuiltInComponentTemplate,
  getDefaultBuiltInTemplateForSurface,
  listBuiltInTemplates,
  resolveBuiltInFormPresentation,
  resolveBuiltInTemplatePresentation,
  resolveListBuiltinTemplateId,
  type BuiltInTemplateContext,
  type FormPresentationKind,
  type ListPresentationKind,
} from "./presets/apply-built-in-template.js";
export type { TemplateBindingContext } from "./presets/resolve-template-placeholders.js";
export {
  resolveContainerChildRows,
  resolveRowHolderChildRows,
} from "./layout/resolve-container-child-rows.js";
export {
  collectOverlayImageRowIds,
  containerEstablishesDefiniteHeight,
  layoutEstablishesDefiniteHeight,
  containerHasFixedExplicitHeight,
  containerHasOverlayImage,
  containerHasPixelMinHeight,
  containerUsesPercentFillHeight,
  containerUsesPercentHeight,
  containerUsesPercentSplitHeight,
  columnStackHasPercentSplitContainer,
  resolvePercentSplitSiblingContainerClass,
  createContainerOverlayContext,
  hasStyleProperty,
  isOverlayImageComponent,
  isOverlayImageRow,
  readStylePropertyValue,
  readPercentSplitLength,
  resolveContainerContentLayerRowStyles,
  resolveContainerPercentSplitFlexStyle,
  resolveContainerShellLayoutStyle,
  resolveContainerShellOverlayStyle,
  resolveImageComponentRowStyles,
  type ContainerOverlayContext,
} from "./layout/container-overlay.js";
export {
  isStructuralLayoutRow,
  resolveParentStackAlign,
  resolveParentStackDirection,
  resolveParentStackStyles,
  resolveParentStackUsesFlexWrap,
  resolvePreviewRowChromeLayoutClasses,
  resolveProductionRowShellClassName,
  resolveRowShellLayoutClasses,
  resolveRowShellLayoutForRender,
  normalizeRuntimeRowShellClassName,
  normalizeRuntimeRowInnerClassName,
  rowPrefersFlexGrow,
  rowUsesContentWidth,
  type RowShellLayoutClasses,
} from "./layout/row-shell-layout.js";
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
  ShadowToken,
} from "./styles/style-types.js";
export { STYLE_PROPERTY_OPTIONS } from "./styles/style-types.js";
export {
  isCssColorValue,
  isCssBackgroundFillValue,
  isCssGradientBackgroundValue,
  isCustomColorValue,
  isCustomBackgroundFillValue,
  isThemeTokenValue,
} from "./styles/color-values.js";
export {
  isCssBoxShadowValue,
  isCssBackdropFilterValue,
  isCssFontFamilyValue,
  isCssLengthTokenValue,
  resolveBoxLengthStyleValue,
  resolveLengthStyleValue,
  resolveMarginStyleValue,
} from "./styles/css-values.js";
export {
  isShadowTokenValue,
  shadowTokenClass,
} from "./styles/shadow-token-values.js";
export {
  resolveBackgroundComponentColor,
  resolveTextComponentColor,
  resolvedBackgroundInlineStyle,
  type ResolvedBackgroundColor,
  type ResolvedBackgroundInlineStyle,
  type ResolvedTextColor,
} from "./styles/resolve-component-color.js";
export {
  themeTokenSwatchClass,
  type ThemeColorRole,
} from "./styles/theme-token-classes.js";
export {
  applyStyleRules,
  resolveStyleRules,
  resolveRowWrapperStyleRules,
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
  textWrapClassForLayoutShell,
  slotFlexGrowClassName,
  stylesIncludeFlexGrow,
  inlineFlexGrowStretchClassName,
  resolveDashboardSectionShellClassName,
  resolveMetricWidgetShellClassName,
  resolveEmbeddableComponentRowClassName,
  columnFlexBasisStyle,
  componentSlotWrapperClassName,
  containerRowWrapperClassName,
  rowPrefersContentWidth,
  prefersInlineContentWidth,
  inlineContentRowClassName,
  flexWrapRowItemClassName,
  isFlexWrapRowStack,
  stackShellWidthClassName,
  stackShellLayoutClasses,
  stretchColumnStackShellClassName,
  rowSiblingContainerShellClassName,
  gapPxFromStyles,
  gapStyleFromStyleRules,
  resolveGridGapCSSValue,
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
  isMarginStyleProperty,
  parseMarginPx,
  parseNonNegativeSpacingPx,
  NEGATIVE_MARGIN_MIN_PX,
} from "./styles/spacing-style-values.js";
export {
  filterComponentInnerStyleRules,
  filterHoistedRowSlotStyleRules,
  isRowSlotHoistedStyleProperty,
  mergeRowWrapperStyles,
  ROW_SLOT_HOISTED_STYLE_PROPERTIES,
} from "./styles/row-slot-styles.js";
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
  listTableColumnFieldOptions,
  isValidTableColumnFieldPath,
  normalizeTableColumnFieldPath,
  sanitizeTableColumnFieldPaths,
  listEntityFieldSelectorFieldOptions,
  isValidEntityFieldSelectorFieldPath,
  type ListLayoutFieldOptionsParams,
  formatFieldPathLabel,
  relationAliasFieldPath,
  type FieldPathValidationDefinition,
} from "./validation/field-paths.js";

export {
  MAX_LAYOUT_RELATION_HOPS,
  resolveLayoutFieldLeaf,
  collectNestedRelationLayoutFieldPaths,
  type ResolvedLayoutFieldLeaf,
  type LayoutFieldLeafLookup,
} from "./validation/layout-field-leaf.js";

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
  columnNodeSchema,
  type UiLayoutDocumentInput,
} from "./schema/ui-layout-schema.js";

export { createLayoutId } from "./builder/id.js";

export {
  createDefaultComponent,
  createDefaultStaticComponent,
  createEmptyColumn,
  createEmptyLayout,
  setRootColumnCount,
  setRootColumnWidthPercent,
  moveRootColumn,
  removeRootColumn,
  updateRootColumnStyles,
  updateRootNodeStyles,
  updateRootColumnDisplayRange,
  updateRootColumnMetaAt,
  updateRootColumnStackDirection,
  addComponentRow,
  updateComponentRow,
  removeRow,
  moveRow,
  updateLayoutMeta,
  normalizeLayout,
  addComponentRowAt,
  insertRowAt,
  insertComponentRowAt,
  insertGridRowAt,
  resolveGridTrackLocators,
  setGridTrackCount,
  setGridTemplateColumns,
  updateGridRowMetaAt,
  type RowInsertPosition,
  removeRowAt,
  moveRowAt,
  updateComponentRowAt,
  updateComponentRowMetaAt,
  replaceLayoutDocument,
  replaceComponentRowAt,
  insertColumnAt,
  appendComponentRowAt,
  updateContainerStylesAt,
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
  ensureRowExpandContainerRootLayout,
  isRowExpandContainerRootLayout,
} from "./builder/row-expand-defaults.js";
export {
  createDefaultListCardLayout,
  ensureListCardContainerRootLayout,
  isListCardContainerRootLayout,
} from "./builder/list-card-defaults.js";
export {
  MAX_DERIVED_EXPRESSION_TOKENS,
  MAX_DERIVED_METRIC_EXPRESSION_METRICS,
  MIN_DERIVED_METRIC_EXPRESSION_METRICS,
  evaluateDerivedExpression,
  extractMetricDefinitionIds,
  migrateLegacyDerivedTerms,
  normalizeMetricDerivedKpiConfig,
  resolveMetricDerivedExpression,
  validateDerivedExpressionGrammar,
  type DerivedExpressionError,
  type DerivedExpressionGrammarError,
} from "./metrics/derived-expression.js";
export {
  resolveMetricKpiValueToneClass,
  type MetricKpiTonePolarity,
} from "./metrics/metric-kpi-tone.js";
export { metricDerivedExpressionTokenSchema } from "./schema/ui-layout-schema.js";
