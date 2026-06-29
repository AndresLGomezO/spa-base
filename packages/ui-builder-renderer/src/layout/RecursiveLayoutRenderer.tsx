import { Fragment, type CSSProperties, type ReactNode } from "react";
import {
  buildGridTemplateColumnsFromPercents,
  columnFlexBasisStyle,
  componentSlotWrapperClassName,
  createContainerOverlayContext,
  containerEstablishesDefiniteHeight,
  containerUsesPercentFillHeight,
  containerUsesPercentSplitHeight,
  columnStackHasPercentSplitContainer,
  resolvePercentSplitSiblingContainerClass,
  flexWrapClassFromStyles,
  gapPxFromStyles,
  gapStyleFromStyleRules,
  hasExplicitColumnWidthPercents,
  isContainerComponent,
  isCssLengthTokenValue,
  mergeRowWrapperStyles,
  parseFlexLayoutFromStyles,
  resolveColumnStackDirection,
  resolveColumnWidthPercents,
  resolveContainerContentLayerRowStyles,
  resolveContainerShellLayoutStyle,
  resolveDisplayRangeVisibility,
  resolveImageComponentRowStyles,
  resolveResponsiveGridLayout,
  resolveRowWrapperStyleRules,
  stylesIncludeFlexGrow,
  usesFlexWrapLayout,
  usesResponsiveGridLayout,
  usesTextWrap,
  containerRowWrapperClassName,
  flexWrapRowItemClassName,
  inlineContentRowClassName,
  resolveEmbeddableComponentRowClassName,
  inlineFlexGrowStretchClassName,
  isFlexWrapRowStack,
  normalizeRuntimeRowInnerClassName,
  normalizeRuntimeRowShellClassName,
  prefersInlineContentWidth,
  resolveRowShellLayoutForRender,
  rowSiblingContainerShellClassName,
  type RowShellLayoutClasses,
  stackShellLayoutClasses,
  stretchColumnStackShellClassName,
  stackShellWidthClassName,
  type ColumnNode,
  type ColumnStackDirection,
  type ContainerOverlayContext,
  type ResponsiveGridBreakpoint,
  type RowLocator,
  type RowNode,
  type UiComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { LayoutGrid, LayoutStack } from "@repo/ui";

import type { LayoutRenderContext } from "../context.js";
import { LayoutRenderOptionsProvider } from "../layout-render-options-context.js";
import { renderUiComponent } from "../engine/render-component.js";
import { resolveMotionPreset } from "../motion/resolve-motion.js";
import { usePreviewBreakpoint } from "../preview-breakpoint-context.js";
import type {
  LayoutWrapperRenderOptions,
  NestedColumnWrapper,
  NestedColumnWrapperContext,
  RootColumnWrapper,
  RowWrapper,
} from "./layout-wrapper-types.js";

export type {
  NestedColumnWrapper,
  NestedColumnWrapperContext,
  RootColumnWrapper,
  RowWrapper,
} from "./layout-wrapper-types.js";

const LIST_DETAIL_COLUMN_SHELL_CLASS = "flex min-w-0 flex-col";
const LIST_DETAIL_ROOT_SHELL_CLASS = "flex min-w-0 flex-col";

function isListOrDetailSurface(context: LayoutRenderContext): boolean {
  return context.mode === "listItem" || context.mode === "detail";
}

function shouldUseProductionRowShellLayout(
  context: LayoutRenderContext,
  usesPreviewRowWrapper: boolean,
): boolean {
  return !usesPreviewRowWrapper && isListOrDetailSurface(context);
}

function resolveRowShellLayoutOptions(options: {
  readonly row: RowNode;
  readonly parentColumn?: ColumnNode;
  readonly stackDirection: ColumnStackDirection;
}) {
  const parentStackDirection = options.parentColumn
    ? resolveColumnStackDirection(options.parentColumn)
    : options.stackDirection;

  return {
    parentStackDirection,
    parentStackAlign: options.parentColumn
      ? parseFlexLayoutFromStyles(options.parentColumn.styles).align
      : undefined,
    parentUsesFlexWrap: options.parentColumn
      ? isFlexWrapRowStack(parentStackDirection, options.parentColumn.styles)
      : false,
    parentStackStyles: options.parentColumn?.styles,
    row: options.row,
  };
}

function wrapProductionRowShell(
  rowShell: RowShellLayoutClasses,
  content: ReactNode,
  shellExtraClassName?: string,
): ReactNode {
  return (
    <div
      className={[
        normalizeRuntimeRowShellClassName(rowShell.shell),
        shellExtraClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      style={rowShell.shellStyle as CSSProperties | undefined}
    >
      <div className={normalizeRuntimeRowInnerClassName(rowShell.inner)}>
        {content}
      </div>
    </div>
  );
}

function stackShellClassForRender(
  styles: readonly import("@repo/ui-builder-core").StyleRule[] | undefined,
  stackDirection: ColumnStackDirection,
  useProductionShellLayout: boolean,
): string {
  if (!useProductionShellLayout) {
    return stackShellLayoutClasses(styles, stackDirection);
  }

  const widthClass = stackShellWidthClassName(styles, stackDirection);
  const neutralWidthClass =
    widthClass === "w-full" ? "min-w-0 max-w-full" : widthClass;
  const minWidthClass = neutralWidthClass.includes("w-fit")
    ? "min-w-max"
    : "min-w-0";

  return ["flex", minWidthClass, neutralWidthClass].join(" ");
}

/** Fills the grid/flex column cell so backgrounds and padding cover the full slot. */
const COLUMN_SHELL_CLASS = "flex h-full min-h-0 w-full min-w-0 flex-col";
const FORM_COLUMN_SHELL_CLASS = "flex w-full min-w-0 flex-col";
const STRETCHED_COLUMN_SHELL_SUFFIX = "h-full min-h-0 self-stretch";
const WIZARD_FORM_COLUMN_SHELL_CLASS =
  "flex min-h-0 min-w-0 flex-col overflow-hidden";

function gapLayoutProps(
  styles: readonly import("@repo/ui-builder-core").StyleRule[] | undefined,
): {
  readonly gap: number;
  readonly style?: CSSProperties;
} {
  const gapCss = gapStyleFromStyleRules(styles);
  if (gapCss && isCssLengthTokenValue(gapCss)) {
    return { gap: 0, style: { gap: gapCss } };
  }

  return { gap: gapPxFromStyles(styles) };
}

function isWizardFormContext(context: LayoutRenderContext): boolean {
  return context.mode === "form" && context.wizard != null;
}

function isWizardStepContentContext(context: LayoutRenderContext): boolean {
  return context.mode === "form" && context.wizardStepContent === true;
}

function columnContainsComponentKind(
  column: ColumnNode,
  kind: string,
): boolean {
  for (const row of column.rows) {
    if (row.type === "component" && row.component.kind === kind) {
      return true;
    }
    if (row.type === "nested-layout") {
      for (const nestedColumn of row.columns) {
        if (columnContainsComponentKind(nestedColumn, kind)) {
          return true;
        }
      }
    }
  }
  return false;
}

function isStretchedSurfaceFillContext(
  context: LayoutRenderContext,
  stretchRootColumns: boolean,
): boolean {
  return (
    stretchRootColumns &&
    (context.mode === "listItem" || context.mode === "detail")
  );
}

function columnShellClassName(
  context: LayoutRenderContext,
  column?: ColumnNode,
  stretchColumn = false,
): string {
  if (isListOrDetailSurface(context) && !stretchColumn) {
    return LIST_DETAIL_COLUMN_SHELL_CLASS;
  }

  const baseClass = (() => {
    if (context.mode === "mainPage") {
      return COLUMN_SHELL_CLASS;
    }
    if (
      stretchColumn &&
      (context.mode === "listItem" || context.mode === "detail")
    ) {
      return COLUMN_SHELL_CLASS;
    }
    if (isWizardStepContentContext(context)) {
      return FORM_COLUMN_SHELL_CLASS;
    }
    if (isWizardFormContext(context)) {
      if (column && !columnContainsComponentKind(column, "wizard-step-host")) {
        return `${WIZARD_FORM_COLUMN_SHELL_CLASS} overflow-y-auto`;
      }
      return WIZARD_FORM_COLUMN_SHELL_CLASS;
    }
    return FORM_COLUMN_SHELL_CLASS;
  })();

  if (baseClass === COLUMN_SHELL_CLASS) {
    return baseClass;
  }

  return stretchColumn
    ? `${baseClass} ${STRETCHED_COLUMN_SHELL_SUFFIX}`
    : baseClass;
}

interface ColumnRenderFlags {
  readonly allowEmpty: boolean;
  readonly stretchColumn: boolean;
}

interface RowRenderScope {
  readonly rootColumnIndex: number;
  readonly containerParentRowId?: string;
  readonly nestedParentRowId?: string;
  readonly nestedColumnIndex?: number;
  readonly containerOverlayContext?: ContainerOverlayContext;
}

function buildRowLocator(scope: RowRenderScope): RowLocator {
  if (scope.nestedParentRowId != null && scope.nestedColumnIndex != null) {
    return {
      scope: "nested",
      columnIndex: scope.rootColumnIndex,
      rowId: scope.nestedParentRowId,
      nestedColumnIndex: scope.nestedColumnIndex,
      containerRowId: scope.containerParentRowId,
    };
  }

  if (scope.containerParentRowId != null) {
    return {
      scope: "container",
      columnIndex: scope.rootColumnIndex,
      containerRowId: scope.containerParentRowId,
    };
  }

  return { scope: "root", columnIndex: scope.rootColumnIndex };
}

type ColumnGridRenderOptions = LayoutWrapperRenderOptions;

function nestedColumnGridOptions(
  context: LayoutRenderContext,
  options?: ColumnGridRenderOptions,
): ColumnGridRenderOptions | undefined {
  if (options === undefined) {
    return undefined;
  }

  const preserveStretch = isStretchedSurfaceFillContext(
    context,
    options.stretchRootColumns ?? false,
  );

  return {
    rowWrapper: options.rowWrapper,
    nestedColumnWrapper: options.nestedColumnWrapper,
    renderEmptyRootColumns: options.renderEmptyRootColumns,
    stretchRootColumns: preserveStretch ? options.stretchRootColumns : false,
  };
}

function shouldStretchRootContainerRow(
  row: RowNode,
  context: LayoutRenderContext,
  rowScope: RowRenderScope,
  columnGridOptions?: ColumnGridRenderOptions,
): boolean {
  return (
    row.type === "component" &&
    isContainerComponent(row.component) &&
    rowScope.nestedParentRowId == null &&
    rowScope.containerParentRowId == null &&
    isStretchedSurfaceFillContext(
      context,
      columnGridOptions?.stretchRootColumns ?? false,
    )
  );
}

function shouldStretchContainerChildRow(
  context: LayoutRenderContext,
  rowScope: RowRenderScope,
  columnGridOptions?: ColumnGridRenderOptions,
): boolean {
  return (
    rowScope.containerParentRowId != null &&
    rowScope.nestedParentRowId == null &&
    isStretchedSurfaceFillContext(
      context,
      columnGridOptions?.stretchRootColumns ?? false,
    )
  );
}

function shouldStretchContainerInnerRows(
  row: RowNode,
  context: LayoutRenderContext,
  rowScope: RowRenderScope,
  columnGridOptions: ColumnGridRenderOptions | undefined,
  containerParentIsRow: boolean,
): boolean {
  if (row.type !== "component" || !isContainerComponent(row.component)) {
    return false;
  }

  const styles = row.component.styles;

  return (
    shouldStretchRootContainerRow(row, context, rowScope, columnGridOptions) ||
    containerParentIsRow ||
    containerEstablishesDefiniteHeight(styles) ||
    containerUsesPercentFillHeight(styles) ||
    containerUsesPercentSplitHeight(styles) ||
    columnStackHasPercentSplitContainer(row.component.rows)
  );
}

function wrapRowContent(
  row: RowNode,
  rowLocator: RowLocator,
  content: ReactNode,
  options?: ColumnGridRenderOptions,
): ReactNode {
  if (!options?.rowWrapper) {
    return content;
  }

  return options.rowWrapper(row, rowLocator, content);
}

function resolveColumnRenderFlags(
  columnCount: number,
  options?: ColumnGridRenderOptions,
): ColumnRenderFlags {
  const isMultiColumn = columnCount > 1;
  return {
    allowEmpty: isMultiColumn || (options?.renderEmptyRootColumns ?? false),
    stretchColumn: options?.stretchRootColumns ?? false,
  };
}

function shouldFillLayoutGridHeight(
  columnCount: number,
  columns: readonly ColumnNode[],
  options?: ColumnGridRenderOptions,
): boolean {
  if (!(options?.stretchRootColumns ?? false)) {
    return false;
  }

  if (columnCount >= 2 && hasExplicitColumnWidthPercents(columns)) {
    return false;
  }

  return true;
}

function renderRows(
  rows: readonly RowNode[],
  context: LayoutRenderContext,
  column: ColumnNode,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  rowScope: RowRenderScope,
  rowMotionIndexOffset = 0,
  stretchColumn = false,
  columnGridOptions?: ColumnGridRenderOptions,
): ReactNode {
  const stackDirection = resolveColumnStackDirection(column);
  const columnFlex = parseFlexLayoutFromStyles(column.styles);
  const isMainPage = context.mode === "mainPage";
  const isWizardForm = isWizardFormContext(context);
  const isWizardStepContent = isWizardStepContentContext(context);
  const isStretchedSurfaceFill = isStretchedSurfaceFillContext(
    context,
    columnGridOptions?.stretchRootColumns ?? false,
  );
  const columnGapProps = gapLayoutProps(column.styles);
  const useProductionShellLayout = shouldUseProductionRowShellLayout(
    context,
    Boolean(columnGridOptions?.rowWrapper),
  );
  const useStretchColumnShell = stretchColumn && stackDirection === "column";
  const columnStackShellClass = useStretchColumnShell
    ? stretchColumnStackShellClassName()
    : stackShellClassForRender(
        column.styles,
        stackDirection,
        useProductionShellLayout,
      );

  return (
    <LayoutStack
      direction={stackDirection}
      gap={columnGapProps.gap}
      style={columnGapProps.style}
      className={[
        columnStackShellClass,
        stretchColumn &&
          stackDirection === "column" &&
          (isMainPage || isStretchedSurfaceFill) &&
          "min-h-0 flex-1",
        stretchColumn &&
          stackDirection === "column" &&
          (isMainPage || isStretchedSurfaceFill) &&
          "h-full overflow-hidden",
        isWizardForm && stackDirection === "column" && "min-h-0 w-full",
        isWizardStepContent && stackDirection === "column" && "min-h-0 w-full",
        !useStretchColumnShell &&
          stretchColumn &&
          stackDirection === "column" &&
          "min-h-0 flex-1 h-full",
        stretchColumn && stackDirection === "row" && "min-h-0 h-full w-full",
        stackDirection === "column" ? "flex-col" : "flex-row",
        stackDirection === "row" &&
          columnFlex.align === undefined &&
          "items-stretch",
        flexWrapClassFromStyles(column.styles),
      ]
        .filter(Boolean)
        .join(" ")}
      align={columnFlex.align}
      justify={columnFlex.justify}
    >
      {rows.map((row, rowIndex) => (
        <Fragment key={row.id}>
          {renderRow(
            row,
            context,
            stackDirection,
            atBreakpoint,
            rowScope,
            rowIndex + rowMotionIndexOffset,
            column,
            columnGridOptions,
          )}
        </Fragment>
      ))}
    </LayoutStack>
  );
}

function rowStackShellClassName(
  stackDirection: ColumnStackDirection,
  component?: UiComponentConfig,
  parentIsFlexWrapRow = false,
): string | undefined {
  if (stackDirection !== "row") {
    return undefined;
  }

  if (component && stylesIncludeFlexGrow(component.styles)) {
    return "min-w-0";
  }

  if (component?.kind === "view-filter") {
    return "min-w-0 w-full max-w-full";
  }

  if (component && prefersInlineContentWidth(component)) {
    return parentIsFlexWrapRow
      ? "max-w-full shrink-0"
      : "w-fit max-w-full shrink-0";
  }

  if (
    component?.kind === "metric-widget" ||
    component?.kind === "dashboard-section"
  ) {
    return parentIsFlexWrapRow
      ? "w-fit max-w-full min-w-0 shrink-0 grow-0 basis-auto"
      : "w-fit max-w-full shrink-0";
  }

  if (usesTextWrap(component?.styles)) {
    return "min-w-0 w-full shrink";
  }

  return "min-w-0 shrink-0";
}

function rowWrapperStyleClassName(
  rowStyles: ReturnType<typeof mergeRowWrapperStyles>,
): string {
  const parts = rowStyles.className
    .split(/\s+/)
    .filter((part) => part.length > 0 && part !== "truncate");

  const hasOverflowRule = parts.some((part) => part.startsWith("overflow-"));
  if (!hasOverflowRule) {
    parts.push("overflow-visible");
  }

  parts.push("py-0.5");

  return parts.join(" ");
}

function layoutGridStretchClassName(
  context: LayoutRenderContext,
  stretchRootColumns = false,
  stretchColumns = false,
): string {
  const isMainPage = context.mode === "mainPage";
  const isFormFill = context.mode === "form";
  const isWizardForm = isWizardFormContext(context);
  const isWizardStepContent = isWizardStepContentContext(context);
  const isListOrDetail = isListOrDetailSurface(context);
  const shouldStretch = stretchRootColumns || stretchColumns;
  const stretchSuffix = shouldStretch ? " h-full min-h-0" : "";
  const isStretchedSurfaceFill = isStretchedSurfaceFillContext(
    context,
    stretchRootColumns,
  );

  if (isListOrDetail && !isStretchedSurfaceFill) {
    return shouldStretch
      ? `min-h-0 flex-1 items-stretch${stretchSuffix}`
      : "items-stretch";
  }

  if (isMainPage || isStretchedSurfaceFill) {
    return `h-full min-h-0 w-full flex-1 items-stretch${stretchSuffix}`;
  }
  if (isWizardForm || isWizardStepContent || isFormFill) {
    return shouldStretch
      ? `min-h-0 w-full flex-1 items-stretch${stretchSuffix}`
      : `w-full items-stretch`;
  }
  return `min-h-0 w-full items-stretch${stretchSuffix}`;
}

function wrapColumn(
  index: number,
  column: ColumnNode,
  children: ReactNode,
  options?: ColumnGridRenderOptions,
  nestedContext?: NestedColumnWrapperContext,
): ReactNode {
  if (nestedContext && options?.nestedColumnWrapper) {
    return options.nestedColumnWrapper(index, column, nestedContext, children);
  }

  if (!nestedContext && options?.rootColumnWrapper) {
    return options.rootColumnWrapper(index, column, children);
  }

  return children;
}

function resolveColumnRowScope(
  columnIndex: number,
  nestedContext?: {
    readonly rootColumnIndex: number;
    readonly nestedParentRowId: string;
    readonly containerParentRowId?: string;
  },
): RowRenderScope {
  if (nestedContext) {
    return {
      rootColumnIndex: nestedContext.rootColumnIndex,
      nestedParentRowId: nestedContext.nestedParentRowId,
      nestedColumnIndex: columnIndex,
      containerParentRowId: nestedContext.containerParentRowId,
    };
  }

  return { rootColumnIndex: columnIndex };
}

function renderLayoutColumnGrid(
  columns: readonly ColumnNode[],
  context: LayoutRenderContext,
  styles: readonly import("@repo/ui-builder-core").StyleRule[] | undefined,
  columnCount: number,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  options?: ColumnGridRenderOptions,
  nestedContext?: {
    readonly rootColumnIndex: number;
    readonly nestedParentRowId: string;
  },
): ReactNode {
  const columnRenderFlags = resolveColumnRenderFlags(columnCount, options);
  const fillGridHeight = shouldFillLayoutGridHeight(
    columnCount,
    columns,
    options,
  );
  const columnFlags: ColumnRenderFlags = {
    ...columnRenderFlags,
    stretchColumn: columnRenderFlags.stretchColumn && fillGridHeight,
  };
  const responsiveLayout = resolveResponsiveGridLayout({
    styles,
    columnCount,
    slotCount: columnCount,
    columns,
    atBreakpoint,
  });
  const stretchClass = layoutGridStretchClassName(
    context,
    fillGridHeight,
    columnFlags.stretchColumn,
  );

  const renderColumnNode = (column: ColumnNode, index: number) =>
    wrapColumn(
      index,
      column,
      renderColumn(
        column,
        context,
        atBreakpoint,
        resolveColumnRowScope(index, nestedContext),
        {
          ...columnFlags,
          columnGridOptions: options,
        },
      ),
      options,
      nestedContext,
    );

  if (responsiveLayout.mode === "responsive") {
    const proportionalStyle =
      responsiveLayout.proportionalColumnsTemplate !== undefined
        ? ({
            "--layout-proportional-cols":
              responsiveLayout.proportionalColumnsTemplate,
          } as CSSProperties)
        : undefined;
    const gridGapProps = gapLayoutProps(styles);

    return (
      <LayoutGrid
        direction="row"
        display="grid"
        gap={gridGapProps.gap}
        align="stretch"
        className={[stretchClass, responsiveLayout.className]
          .filter(Boolean)
          .join(" ")}
        style={{ ...proportionalStyle, ...gridGapProps.style }}
      >
        {columns.map((column, index) => (
          <Fragment key={column.id}>{renderColumnNode(column, index)}</Fragment>
        ))}
      </LayoutGrid>
    );
  }

  if (responsiveLayout.mode === "autoFit") {
    const gridGapProps = gapLayoutProps(styles);
    return (
      <LayoutGrid
        direction="row"
        gap={gridGapProps.gap}
        columns={responsiveLayout.columnsTemplate}
        align="stretch"
        className={stretchClass}
        style={gridGapProps.style}
      >
        {columns.map((column, index) => (
          <Fragment key={column.id}>{renderColumnNode(column, index)}</Fragment>
        ))}
      </LayoutGrid>
    );
  }

  const gridGapProps = gapLayoutProps(styles);
  return (
    <LayoutGrid
      direction="row"
      gap={gridGapProps.gap}
      columns={
        responsiveLayout.columnsTemplate ??
        buildGridTemplateColumnsFromPercents(
          resolveColumnWidthPercents(columns),
        )
      }
      align="stretch"
      className={stretchClass}
      style={gridGapProps.style}
    >
      {columns.map((column, index) => (
        <Fragment key={column.id}>{renderColumnNode(column, index)}</Fragment>
      ))}
    </LayoutGrid>
  );
}

function renderWrappedColumns(
  columns: readonly ColumnNode[],
  context: LayoutRenderContext,
  styles: readonly import("@repo/ui-builder-core").StyleRule[] | undefined,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  columnCount: number,
  options?: ColumnGridRenderOptions,
  nestedContext?: {
    readonly rootColumnIndex: number;
    readonly nestedParentRowId: string;
  },
): ReactNode {
  const columnRenderFlags = resolveColumnRenderFlags(columnCount, options);
  const fillGridHeight = shouldFillLayoutGridHeight(
    columnCount,
    columns,
    options,
  );
  const columnFlags: ColumnRenderFlags = {
    ...columnRenderFlags,
    stretchColumn: columnRenderFlags.stretchColumn && fillGridHeight,
  };
  const percents = resolveColumnWidthPercents(columns);
  const wrappedGapProps = gapLayoutProps(styles);

  return (
    <LayoutStack
      direction="row"
      gap={wrappedGapProps.gap}
      style={wrappedGapProps.style}
      className={[
        isListOrDetailSurface(context) ? "flex min-w-0" : "flex w-full min-w-0",
        columnFlags.stretchColumn && "h-full min-h-0",
        flexWrapClassFromStyles(styles),
      ]
        .filter(Boolean)
        .join(" ")}
      align="stretch"
    >
      {columns.map((column, index) => {
        const columnContent = renderColumn(
          column,
          context,
          atBreakpoint,
          resolveColumnRowScope(index, nestedContext),
          {
            ...columnFlags,
            flexBasisPercent: percents[index],
            columnGridOptions: options,
          },
        );
        if (!columnContent) {
          return null;
        }

        return (
          <Fragment key={column.id}>
            {wrapColumn(index, column, columnContent, options, nestedContext)}
          </Fragment>
        );
      })}
    </LayoutStack>
  );
}

function resolveRowDisplayRange(
  row: RowNode,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
): { readonly hidden: boolean; readonly className?: string } {
  return resolveDisplayRangeVisibility(
    row.displayFrom,
    row.displayTo,
    atBreakpoint,
    "flex",
  );
}

function resolveColumnDisplayRange(
  column: ColumnNode,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
): { readonly hidden: boolean; readonly className?: string } {
  return resolveDisplayRangeVisibility(
    column.displayFrom,
    column.displayTo,
    atBreakpoint,
    "flex",
  );
}

function renderRow(
  row: RowNode,
  context: LayoutRenderContext,
  stackDirection: ColumnStackDirection,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  rowScope: RowRenderScope,
  rowIndex = 0,
  parentColumn?: ColumnNode,
  columnGridOptions?: ColumnGridRenderOptions,
): ReactNode {
  const displayRange = resolveRowDisplayRange(row, atBreakpoint);
  if (displayRange.hidden) {
    return null;
  }

  const rowLocator = buildRowLocator(rowScope);
  const parentStackDirection = parentColumn
    ? resolveColumnStackDirection(parentColumn)
    : stackDirection;
  const parentIsFlexWrapRow = parentColumn
    ? isFlexWrapRowStack(parentStackDirection, parentColumn.styles)
    : false;
  const usesPreviewRowWrapper = Boolean(columnGridOptions?.rowWrapper);
  const useProductionShellLayout = shouldUseProductionRowShellLayout(
    context,
    usesPreviewRowWrapper,
  );
  const rowShellLayout = useProductionShellLayout
    ? resolveRowShellLayoutForRender(
        resolveRowShellLayoutOptions({ row, parentColumn, stackDirection }),
      )
    : undefined;
  const flexWrapRowItemClass =
    usesPreviewRowWrapper || !parentColumn || useProductionShellLayout
      ? ""
      : flexWrapRowItemClassName(
          parentStackDirection,
          parentColumn.styles,
          row,
        );
  const stackShellClass = rowStackShellClassName(stackDirection);

  if (row.type === "component") {
    if (isContainerComponent(row.component)) {
      const containerOverlayContext = createContainerOverlayContext(
        row.component.rows,
      );
      const containerStyles = resolveRowWrapperStyleRules(row.component.styles);
      const containerShellStyle = resolveContainerShellLayoutStyle(
        row.component.styles,
        row.component.rows,
        {
          parentStackDirection: stackDirection,
          applyPercentSplitFlex:
            !usesPreviewRowWrapper && !useProductionShellLayout,
        },
      );
      const containerStackDirection = row.component.stackDirection ?? "column";
      const containerParentIsRow = stackDirection === "row";
      const stretchRootContainer = shouldStretchRootContainerRow(
        row,
        context,
        rowScope,
        columnGridOptions,
      );
      const rootContainerDefiniteHeight = containerEstablishesDefiniteHeight(
        row.component.styles,
      );
      const percentSplitHeight = containerUsesPercentSplitHeight(
        row.component.styles,
      );
      const stretchPercentFillContainer =
        !stretchRootContainer &&
        !percentSplitHeight &&
        rowScope.containerParentRowId != null &&
        rowScope.nestedParentRowId == null &&
        containerUsesPercentFillHeight(row.component.styles) &&
        (isStretchedSurfaceFillContext(
          context,
          columnGridOptions?.stretchRootColumns ?? false,
        ) ||
          stackDirection === "column");
      const splitSiblingContainerClass =
        !usesPreviewRowWrapper && !useProductionShellLayout && parentColumn
          ? resolvePercentSplitSiblingContainerClass(
              row,
              stackDirection,
              parentColumn.rows,
            )
          : undefined;
      const stretchedContainerClass = useProductionShellLayout
        ? undefined
        : stretchRootContainer
          ? rootContainerDefiniteHeight
            ? "flex min-h-0 w-full min-w-0 shrink-0 flex-col"
            : "flex min-h-0 flex-1 h-full w-full min-w-0 flex-col"
          : percentSplitHeight
            ? stackDirection === "column"
              ? "flex min-h-0 h-full w-full min-w-0 shrink-0 flex-col"
              : "flex min-h-0 w-full min-w-0 shrink-0 flex-col"
            : stretchPercentFillContainer
              ? "flex min-h-0 flex-1 h-full w-full min-w-0 flex-col"
              : (splitSiblingContainerClass ??
                (containerParentIsRow
                  ? rowSiblingContainerShellClassName()
                  : undefined));
      const syntheticColumn: ColumnNode = {
        id: `${row.id}-container`,
        rows: row.component.rows,
        styles: row.component.styles,
        stackDirection: row.component.stackDirection,
      };
      const containerScope: RowRenderScope = {
        rootColumnIndex: rowScope.rootColumnIndex,
        containerParentRowId: row.id,
        containerOverlayContext,
      };
      const containerWidthClass =
        useProductionShellLayout || flexWrapRowItemClass
          ? ""
          : stackShellWidthClassName(
              row.component.styles,
              containerStackDirection,
            );
      const containerShellExtraClassName =
        useProductionShellLayout &&
        containerParentIsRow &&
        !percentSplitHeight &&
        !stretchRootContainer &&
        !stretchPercentFillContainer
          ? "self-stretch"
          : undefined;
      const containerBody = (
        <div
          key={row.id}
          className={[
            stretchedContainerClass,
            flexWrapRowItemClass,
            containerWidthClass,
            containerRowWrapperClassName(
              row.component.styles,
              containerStackDirection,
            ),
            containerStyles.className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={containerShellStyle}
        >
          {renderRows(
            row.component.rows,
            context,
            syntheticColumn,
            atBreakpoint,
            containerScope,
            rowIndex,
            shouldStretchContainerInnerRows(
              row,
              context,
              rowScope,
              columnGridOptions,
              containerParentIsRow,
            ),
            columnGridOptions,
          )}
        </div>
      );

      return wrapRowContent(
        row,
        rowLocator,
        useProductionShellLayout && rowShellLayout ? (
          <Fragment key={row.id}>
            {wrapProductionRowShell(
              rowShellLayout,
              containerBody,
              containerShellExtraClassName,
            )}
          </Fragment>
        ) : (
          containerBody
        ),
        columnGridOptions,
      );
    }

    const overlayContext = rowScope.containerOverlayContext;
    const componentStylesForRow =
      row.component.kind === "image"
        ? resolveImageComponentRowStyles(row.component)
        : row.component.styles;
    const rowStylesForMerge = overlayContext
      ? resolveContainerContentLayerRowStyles(
          row.styles,
          componentStylesForRow,
          overlayContext,
          row,
        )
      : row.styles;
    const rowStyles = mergeRowWrapperStyles(
      rowStylesForMerge,
      componentStylesForRow,
    );
    const motionClass = resolveMotionPreset(row.motion, rowIndex);
    const isMainPage = context.mode === "mainPage";
    const isFormFill = context.mode === "form";
    const isWizardForm = isWizardFormContext(context);
    const isWizardStepContent = isWizardStepContentContext(context);
    const isPageListRow = row.component.kind === "page-list";
    const isPageToolbarRow = row.component.kind === "page-toolbar";
    const isWizardActionsRow = row.component.kind === "wizard-actions";
    const isWizardStepHostRow = row.component.kind === "wizard-step-host";
    const isWizardProgressRow = row.component.kind === "wizard-progress";
    const isEntityFieldSelectorRow =
      row.component.kind === "entity-field-selector";
    const isEmbeddableLayoutRow =
      row.component.kind === "dashboard-section" ||
      row.component.kind === "metric-widget";
    const embeddableLayoutRowClass = isEmbeddableLayoutRow
      ? resolveEmbeddableComponentRowClassName(row.component, stackDirection)
      : undefined;
    const mainPageRowClass =
      isMainPage && stackDirection === "column"
        ? isPageListRow
          ? "relative z-0 flex min-h-0 min-w-0 flex-1 flex-col"
          : isPageToolbarRow
            ? "relative z-20 shrink-0"
            : "shrink-0"
        : undefined;
    const formRowClass =
      isFormFill &&
      stackDirection === "column" &&
      !isWizardStepHostRow &&
      !isWizardProgressRow &&
      !isWizardActionsRow
        ? isWizardStepContent && isEntityFieldSelectorRow
          ? "flex w-full min-w-0 flex-col"
          : isWizardForm || isWizardStepContent
            ? "shrink-0"
            : "flex w-full min-w-0 shrink-0 flex-col"
        : undefined;
    const wizardActionsRowClass =
      isFormFill && stackDirection === "column" && isWizardActionsRow
        ? "shrink-0"
        : undefined;
    const wizardStepHostRowClass =
      isWizardForm && stackDirection === "column" && isWizardStepHostRow
        ? "flex min-h-0 flex-1 w-full min-w-0 flex-col overflow-hidden overflow-x-hidden"
        : undefined;
    const wizardProgressRowClass =
      isWizardForm && stackDirection === "column" && isWizardProgressRow
        ? "shrink-0"
        : undefined;
    const inlineContentRowClass =
      usesPreviewRowWrapper || !parentIsFlexWrapRow
        ? inlineContentRowClassName(row.component, false)
        : inlineContentRowClassName(row.component, parentIsFlexWrapRow);
    const formSlotClassName =
      isFormFill && stackDirection === "column"
        ? componentSlotWrapperClassName(row.component.styles, stackDirection)
            .split(/\s+/)
            .filter(
              (part) =>
                part.length > 0 &&
                !part.startsWith("flex-[") &&
                part !== "flex-1" &&
                part !== "grow",
            )
            .join(" ")
        : componentSlotWrapperClassName(row.component.styles, stackDirection);
    const rowDiv = (
      <div
        key={row.id}
        className={[
          flexWrapRowItemClass,
          rowStackShellClassName(
            stackDirection,
            row.component,
            usesPreviewRowWrapper ? false : parentIsFlexWrapRow,
          ),
          embeddableLayoutRowClass,
          mainPageRowClass,
          formRowClass,
          wizardActionsRowClass,
          wizardStepHostRowClass,
          wizardProgressRowClass,
          inlineContentRowClass,
          inlineFlexGrowStretchClassName(row.component, stackDirection),
          formSlotClassName,
          rowWrapperStyleClassName(rowStyles),
          motionClass,
          displayRange.className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={rowStyles.style}
      >
        {renderUiComponent(row.component, context)}
      </div>
    );

    return wrapRowContent(
      row,
      rowLocator,
      useProductionShellLayout && rowShellLayout ? (
        <Fragment key={row.id}>
          {wrapProductionRowShell(rowShellLayout, rowDiv)}
        </Fragment>
      ) : (
        rowDiv
      ),
      columnGridOptions,
    );
  }

  const rowStyles = resolveRowWrapperStyleRules(row.styles);
  const isFormFill = context.mode === "form";
  const stretchedSurfaceNestedRowClass =
    !useProductionShellLayout &&
    shouldStretchContainerChildRow(context, rowScope, columnGridOptions)
      ? "flex min-h-0 flex-1 h-full w-full min-w-0 flex-col"
      : undefined;
  const formNestedRowClass =
    isFormFill && stackDirection === "column"
      ? "flex w-full min-w-0 shrink-0 flex-col"
      : undefined;
  const nestedContext = {
    rootColumnIndex: rowScope.rootColumnIndex,
    containerParentRowId: rowScope.containerParentRowId,
    nestedParentRowId: row.id,
  };
  const columnStructuralRowClass =
    useProductionShellLayout || stackDirection !== "column"
      ? undefined
      : "w-full min-w-0";
  const nestedRowBody = (key: string, children: ReactNode) => (
    <div
      key={key}
      className={[
        columnStructuralRowClass,
        stackShellClass,
        stretchedSurfaceNestedRowClass,
        formNestedRowClass,
        rowStyles.className,
        displayRange.className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={rowStyles.style}
    >
      {children}
    </div>
  );

  if (
    !usesResponsiveGridLayout(row.styles, row.columnCount) &&
    usesFlexWrapLayout(row.styles)
  ) {
    const nestedContent = nestedRowBody(
      row.id,
      renderWrappedColumns(
        row.columns,
        context,
        row.styles,
        atBreakpoint,
        row.columnCount,
        nestedColumnGridOptions(context, columnGridOptions),
        nestedContext,
      ),
    );

    return wrapRowContent(
      row,
      rowLocator,
      useProductionShellLayout && rowShellLayout ? (
        <Fragment key={row.id}>
          {wrapProductionRowShell(rowShellLayout, nestedContent)}
        </Fragment>
      ) : (
        nestedContent
      ),
      columnGridOptions,
    );
  }

  const nestedContent = nestedRowBody(
    row.id,
    renderLayoutColumnGrid(
      row.columns,
      context,
      row.styles,
      row.columnCount,
      atBreakpoint,
      nestedColumnGridOptions(context, columnGridOptions),
      nestedContext,
    ),
  );

  return wrapRowContent(
    row,
    rowLocator,
    useProductionShellLayout && rowShellLayout ? (
      <Fragment key={row.id}>
        {wrapProductionRowShell(rowShellLayout, nestedContent)}
      </Fragment>
    ) : (
      nestedContent
    ),
    columnGridOptions,
  );
}

function renderColumn(
  column: ColumnNode,
  context: LayoutRenderContext,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  rowScope: RowRenderScope,
  options?: {
    readonly allowEmpty?: boolean;
    readonly flexBasisPercent?: number;
    readonly stretchColumn?: boolean;
    readonly columnGridOptions?: ColumnGridRenderOptions;
  },
): ReactNode {
  const displayRange = resolveColumnDisplayRange(column, atBreakpoint);
  if (displayRange.hidden) {
    return null;
  }

  if (column.rows.length === 0 && !options?.allowEmpty) {
    return null;
  }

  const columnStyles = resolveRowWrapperStyleRules(column.styles);
  const flexBasis =
    options?.flexBasisPercent !== undefined
      ? columnFlexBasisStyle(options.flexBasisPercent)
      : undefined;
  const useEmptyMinHeight =
    options?.allowEmpty && column.rows.length === 0 && !options.stretchColumn;

  return (
    <div
      key={column.id}
      className={[
        columnShellClassName(context, column, options?.stretchColumn),
        columnStyles.className,
        displayRange.className,
        useEmptyMinHeight ? "min-h-24" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...columnStyles.style,
        ...flexBasis,
      }}
    >
      {column.rows.length > 0
        ? renderRows(
            column.rows,
            context,
            column,
            atBreakpoint,
            rowScope,
            0,
            options?.stretchColumn,
            nestedColumnGridOptions(context, options?.columnGridOptions),
          )
        : null}
    </div>
  );
}

export interface RecursiveLayoutRendererProps {
  readonly layout: UiLayoutDocument;
  readonly context: LayoutRenderContext;
  readonly className?: string;
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly nestedColumnWrapper?: NestedColumnWrapper;
  readonly rowWrapper?: RowWrapper;
  readonly renderEmptyRootColumns?: boolean;
  readonly stretchRootColumns?: boolean;
}

export function RecursiveLayoutRenderer({
  layout,
  context,
  className,
  rootColumnWrapper,
  nestedColumnWrapper,
  rowWrapper,
  renderEmptyRootColumns = false,
  stretchRootColumns = false,
}: RecursiveLayoutRendererProps): ReactNode {
  const atBreakpoint = usePreviewBreakpoint();
  const rootMotionClass = resolveMotionPreset(layout.motion);
  const isMainPage = context.mode === "mainPage";
  const isFormFill = context.mode === "form";
  const isWizardForm = isWizardFormContext(context);
  const isWizardStepContent = isWizardStepContentContext(context);
  const isStretchedSurfaceFill = isStretchedSurfaceFillContext(
    context,
    stretchRootColumns,
  );
  const fillRootClass = isMainPage
    ? "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    : isStretchedSurfaceFill
      ? "flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col"
      : isListOrDetailSurface(context)
        ? LIST_DETAIL_ROOT_SHELL_CLASS
        : isWizardForm || isWizardStepContent
          ? stretchRootColumns
            ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
            : "flex w-full min-w-0 flex-col"
          : isFormFill
            ? stretchRootColumns
              ? "flex h-full min-h-0 w-full min-w-0 flex-col"
              : "flex w-full min-w-0 flex-col"
            : "flex w-full min-w-0 max-w-full flex-col";
  const rootStylesResolved = resolveRowWrapperStyleRules(
    layout.root.styles,
    className,
  );
  const columnGridOptions: ColumnGridRenderOptions = {
    rootColumnWrapper,
    nestedColumnWrapper,
    rowWrapper,
    renderEmptyRootColumns,
    stretchRootColumns,
  };

  if (
    !usesResponsiveGridLayout(layout.root.styles, layout.root.columnCount) &&
    usesFlexWrapLayout(layout.root.styles)
  ) {
    return (
      <LayoutRenderOptionsProvider value={columnGridOptions}>
        <div
          className={[
            fillRootClass,
            rootStylesResolved.className,
            rootMotionClass,
          ]
            .filter(Boolean)
            .join(" ")}
          style={rootStylesResolved.style}
        >
          {renderWrappedColumns(
            layout.root.columns,
            context,
            layout.root.styles,
            atBreakpoint,
            layout.root.columnCount,
            columnGridOptions,
          )}
        </div>
      </LayoutRenderOptionsProvider>
    );
  }

  return (
    <LayoutRenderOptionsProvider value={columnGridOptions}>
      <div
        className={[
          fillRootClass,
          rootStylesResolved.className,
          rootMotionClass,
        ]
          .filter(Boolean)
          .join(" ")}
        style={rootStylesResolved.style}
      >
        {renderLayoutColumnGrid(
          layout.root.columns,
          context,
          layout.root.styles,
          layout.root.columnCount,
          atBreakpoint,
          columnGridOptions,
        )}
      </div>
    </LayoutRenderOptionsProvider>
  );
}
