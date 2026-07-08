import { Fragment, type CSSProperties, type ReactNode } from "react";
import { ResponsiveStyleTag } from "./ResponsiveStyleTag.js";
import {
  buildGridTemplateColumnsFromPercents,
  columnFlexBasisStyle,
  componentSlotWrapperClassName,
  createContainerOverlayContext,
  containerEstablishesDefiniteHeight,
  containerUsesPercentFillHeight,
  containerUsesPercentSplitHeight,
  columnStackHasPercentSplitContainer,
  isCardGlowOverlayContainerRow,
  resolvePercentSplitSiblingContainerClass,
  flexWrapClassFromStyles,
  hasExplicitColumnWidthPercents,
  isContainerComponent,
  filterLayoutStyleRules,
  isGridComponent,
  isScreenRootNode,
  normalizeGridTemplateColumnsForCss,
  mergeRowWrapperStyles,
  parseFlexLayoutFromStyles,
  resolveColumnStackDirection,
  resolveColumnWidthPercents,
  resolveContainerContentLayerRowStyles,
  resolveContainerShellLayoutStyle,
  resolveDisplayRangeVisibility,
  resolveChartComponentRowStyles,
  resolveImageComponentRowStyles,
  resolveResponsiveGridLayout,
  resolveLayoutSpacingProps,
  resolveGridGapCSSValue,
  resolveRowWrapperStyleRules,
  stylesHaveWidthBounds,
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
  type StyleRule,
  type UiComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { LayoutGrid, LayoutStack } from "@repo/ui";

import type { LayoutRenderContext } from "../context.js";
import { wrapRowWithClickAction } from "../click-action/wrap-row-click-action.js";
import { LayoutRenderOptionsProvider } from "../layout-render-options-context.js";
import { renderUiComponent } from "../engine/render-component.js";
import {
  resolveMotionPreset,
  mergeMotionPresetStyle,
} from "../motion/resolve-motion.js";
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
  readonly atBreakpoint?: ResponsiveGridBreakpoint;
}) {
  const parentStackDirection = options.parentColumn
    ? resolveColumnStackDirection(options.parentColumn)
    : options.stackDirection;

  return {
    parentStackDirection,
    parentStackAlign: options.parentColumn
      ? parseFlexLayoutFromStyles(
          options.parentColumn.styles,
          options.atBreakpoint,
        ).align
      : undefined,
    parentUsesFlexWrap: options.parentColumn
      ? isFlexWrapRowStack(
          parentStackDirection,
          options.parentColumn.styles,
          options.atBreakpoint,
        )
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
  atBreakpoint?: ResponsiveGridBreakpoint,
): string {
  if (!useProductionShellLayout) {
    return stackShellLayoutClasses(styles, stackDirection);
  }

  const widthClass = stackShellWidthClassName(
    styles,
    stackDirection,
    atBreakpoint,
  );
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
  styles: readonly StyleRule[] | undefined,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
): {
  readonly gap: number | null;
  readonly style?: CSSProperties;
  readonly className?: string;
  readonly cssText?: string;
} {
  return resolveLayoutSpacingProps(styles, atBreakpoint);
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
    if (
      row.type === "component" &&
      (row.component.kind === "container" || row.component.kind === "grid")
    ) {
      for (const childRow of row.component.rows) {
        if (childRow.type === "component" && childRow.component.kind === kind) {
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
  readonly containerOverlayContext?: ContainerOverlayContext;
}

function buildRowLocator(scope: RowRenderScope): RowLocator {
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
    rowScope.containerParentRowId == null &&
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
  const columnFlex = parseFlexLayoutFromStyles(column.styles, atBreakpoint);
  const isMainPage = context.mode === "mainPage";
  const isWizardForm = isWizardFormContext(context);
  const isWizardStepContent = isWizardStepContentContext(context);
  const isStretchedSurfaceFill = isStretchedSurfaceFillContext(
    context,
    columnGridOptions?.stretchRootColumns ?? false,
  );
  const columnGapProps = gapLayoutProps(column.styles, atBreakpoint);
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
        atBreakpoint,
      );

  return (
    <LayoutStack
      direction={stackDirection}
      gap={columnGapProps.gap}
      style={columnGapProps.style}
      className={[
        columnStackShellClass,
        columnGapProps.className,
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
        flexWrapClassFromStyles(column.styles, atBreakpoint),
      ]
        .filter(Boolean)
        .join(" ")}
      align={columnFlex.align}
      justify={columnFlex.justify}
    >
      <ResponsiveStyleTag cssText={columnGapProps.cssText} />
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

function renderGridTrackRows(
  tracks: readonly RowNode[],
  context: LayoutRenderContext,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  gridScope: RowRenderScope,
  rowIndexOffset: number,
  parentColumn: ColumnNode,
  columnGridOptions?: ColumnGridRenderOptions,
): ReactNode {
  return tracks.map((trackRow, trackIndex) => (
    <Fragment key={trackRow.id}>
      {renderRow(
        trackRow,
        context,
        "column",
        atBreakpoint,
        gridScope,
        rowIndexOffset + trackIndex,
        parentColumn,
        columnGridOptions,
      )}
    </Fragment>
  ));
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

  if (component && stylesHaveWidthBounds(component.styles)) {
    return "min-w-0 max-w-full flex-[1_1_auto] basis-auto";
  }

  if (component && prefersInlineContentWidth(component)) {
    return parentIsFlexWrapRow
      ? "max-w-full shrink-0"
      : "w-fit max-w-full shrink-0";
  }

  if (
    component?.kind === "metric-widget" ||
    component?.kind === "metric-kpi" ||
    component?.kind === "metric-derived-kpi" ||
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
  parentContext?: {
    readonly rootColumnIndex: number;
    readonly containerParentRowId?: string;
  },
): RowRenderScope {
  if (parentContext?.containerParentRowId) {
    return {
      rootColumnIndex: parentContext.rootColumnIndex,
      containerParentRowId: parentContext.containerParentRowId,
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
    const gridGapProps = gapLayoutProps(styles, atBreakpoint);

    return (
      <LayoutGrid
        direction="row"
        display="grid"
        gap={gridGapProps.gap}
        align="stretch"
        className={[
          stretchClass,
          responsiveLayout.className,
          gridGapProps.className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ...proportionalStyle, ...gridGapProps.style }}
      >
        <ResponsiveStyleTag cssText={gridGapProps.cssText} />
        {columns.map((column, index) => (
          <Fragment key={column.id}>{renderColumnNode(column, index)}</Fragment>
        ))}
      </LayoutGrid>
    );
  }

  if (responsiveLayout.mode === "autoFit") {
    const gridGapProps = gapLayoutProps(styles, atBreakpoint);
    return (
      <LayoutGrid
        direction="row"
        gap={gridGapProps.gap}
        columns={responsiveLayout.columnsTemplate}
        align="stretch"
        className={[stretchClass, gridGapProps.className]
          .filter(Boolean)
          .join(" ")}
        style={gridGapProps.style}
      >
        <ResponsiveStyleTag cssText={gridGapProps.cssText} />
        {columns.map((column, index) => (
          <Fragment key={column.id}>{renderColumnNode(column, index)}</Fragment>
        ))}
      </LayoutGrid>
    );
  }

  const gridGapProps = gapLayoutProps(styles, atBreakpoint);
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
      className={[stretchClass, gridGapProps.className]
        .filter(Boolean)
        .join(" ")}
      style={gridGapProps.style}
    >
      <ResponsiveStyleTag cssText={gridGapProps.cssText} />
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
  const wrappedGapProps = gapLayoutProps(styles, atBreakpoint);

  return (
    <LayoutStack
      direction="row"
      gap={wrappedGapProps.gap}
      style={wrappedGapProps.style}
      className={[
        isListOrDetailSurface(context) ? "flex min-w-0" : "flex w-full min-w-0",
        columnFlags.stretchColumn && "h-full min-h-0",
        flexWrapClassFromStyles(styles, atBreakpoint),
        wrappedGapProps.className,
      ]
        .filter(Boolean)
        .join(" ")}
      align="stretch"
    >
      <ResponsiveStyleTag cssText={wrappedGapProps.cssText} />
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
    ? isFlexWrapRowStack(
        parentStackDirection,
        parentColumn.styles,
        atBreakpoint,
      )
    : false;
  const usesPreviewRowWrapper = Boolean(columnGridOptions?.rowWrapper);
  const useProductionShellLayout = shouldUseProductionRowShellLayout(
    context,
    usesPreviewRowWrapper,
  );
  const rowShellLayout = useProductionShellLayout
    ? resolveRowShellLayoutForRender(
        resolveRowShellLayoutOptions({
          row,
          parentColumn,
          stackDirection,
          atBreakpoint,
        }),
      )
    : undefined;
  const flexWrapRowItemClass =
    usesPreviewRowWrapper || !parentColumn || useProductionShellLayout
      ? ""
      : flexWrapRowItemClassName(
          parentStackDirection,
          parentColumn.styles,
          row,
          atBreakpoint,
        );
  const motionPreset =
    row.type === "component"
      ? resolveMotionPreset(row.motion, rowIndex)
      : { className: "" };
  if (row.type === "component") {
    if (isGridComponent(row.component)) {
      const gridStyles = resolveRowWrapperStyleRules(row.component.styles, {
        atBreakpoint,
      });
      const gridInlineStyle = gridStyles.style ?? {};
      const gridStyleWithoutGap = { ...gridInlineStyle };
      delete gridStyleWithoutGap.gap;
      const syntheticColumn: ColumnNode = {
        id: `${row.id}-grid`,
        rows: row.component.rows,
      };
      const gridScope: RowRenderScope = {
        rootColumnIndex: rowScope.rootColumnIndex,
        containerParentRowId: row.id,
      };
      const resolvedGap = resolveGridGapCSSValue(
        row.component.gap,
        row.component.styles,
        atBreakpoint,
      );
      const gridInner = (
        <div
          key={row.id}
          className={[gridStyles.className, motionPreset.className]
            .filter(Boolean)
            .join(" ")}
          style={{
            display: "grid",
            gridTemplateColumns: normalizeGridTemplateColumnsForCss(
              row.component.gridTemplateColumns,
            ),
            alignItems: row.component.alignItems,
            ...mergeMotionPresetStyle(gridStyleWithoutGap, motionPreset),
            ...(resolvedGap !== undefined ? { gap: resolvedGap } : {}),
          }}
        >
          <ResponsiveStyleTag cssText={gridStyles.cssText} />
          {renderGridTrackRows(
            row.component.rows,
            context,
            atBreakpoint,
            gridScope,
            rowIndex,
            syntheticColumn,
            columnGridOptions,
          )}
        </div>
      );
      return wrapRowContent(
        row,
        rowLocator,
        wrapRowWithClickAction(row, gridInner, context),
        columnGridOptions,
      );
    }

    if (
      isContainerComponent(row.component) &&
      row.component.rows.length === 0 &&
      !row.component.stackDirection &&
      filterLayoutStyleRules(row.component.styles ?? []).length === 0
    ) {
      const neutralStyles = resolveRowWrapperStyleRules(row.component.styles, {
        atBreakpoint,
      });
      const neutralInner = (
        <div
          key={row.id}
          className={[neutralStyles.className, motionPreset.className]
            .filter(Boolean)
            .join(" ")}
          style={mergeMotionPresetStyle(neutralStyles.style, motionPreset)}
        />
      );
      return wrapRowContent(
        row,
        rowLocator,
        wrapRowWithClickAction(row, neutralInner, context),
        columnGridOptions,
      );
    }

    if (
      row.type === "component" &&
      isContainerComponent(row.component) &&
      isCardGlowOverlayContainerRow(row)
    ) {
      const overlayStyles = resolveRowWrapperStyleRules(row.component.styles, {
        atBreakpoint,
      });
      const overlayInner = (
        <div
          aria-hidden
          key={row.id}
          className={overlayStyles.className}
          style={overlayStyles.style}
        />
      );
      return wrapRowContent(row, rowLocator, overlayInner, columnGridOptions);
    }

    if (isContainerComponent(row.component)) {
      const containerOverlayContext = createContainerOverlayContext(
        row.component.rows,
      );
      const containerStyles = resolveRowWrapperStyleRules(
        row.component.styles,
        {
          atBreakpoint,
        },
      );
      const containerShellStyle = resolveContainerShellLayoutStyle(
        row.component.styles,
        row.component.rows,
        {
          parentStackDirection: stackDirection,
          applyPercentSplitFlex:
            !usesPreviewRowWrapper && !useProductionShellLayout,
          atBreakpoint,
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
              atBreakpoint,
            );
      const containerShellExtraClassName =
        useProductionShellLayout &&
        containerParentIsRow &&
        !percentSplitHeight &&
        !stretchRootContainer &&
        !stretchPercentFillContainer
          ? "self-stretch"
          : undefined;
      const containerInner = (
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
            motionPreset.className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={mergeMotionPresetStyle(
            {
              ...containerShellStyle,
              ...containerStyles.style,
            },
            motionPreset,
          )}
        >
          <ResponsiveStyleTag cssText={containerStyles.cssText} />
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
      const containerBody = wrapRowWithClickAction(
        row,
        containerInner,
        context,
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
        : row.component.kind === "chart"
          ? resolveChartComponentRowStyles(row.component)
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
      { atBreakpoint },
    );
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
          motionPreset.className,
          displayRange.className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={mergeMotionPresetStyle(rowStyles.style, motionPreset)}
      >
        <ResponsiveStyleTag cssText={rowStyles.cssText} />
        {wrapRowWithClickAction(
          row,
          renderUiComponent(row.component, context, atBreakpoint),
          context,
        )}
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

  return null;
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

  const columnStyles = resolveRowWrapperStyleRules(column.styles, {
    atBreakpoint,
  });
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
      <ResponsiveStyleTag cssText={columnStyles.cssText} />
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

  if (isScreenRootNode(layout.root)) {
    const screenRoot = layout.root;
    const rootStylesResolved = resolveRowWrapperStyleRules(screenRoot.styles, {
      baseClassName: className,
      atBreakpoint,
    });
    const columnGridOptions: ColumnGridRenderOptions = {
      rootColumnWrapper,
      nestedColumnWrapper,
      rowWrapper,
      renderEmptyRootColumns,
      stretchRootColumns,
    };
    const syntheticColumn: ColumnNode = {
      id: `${screenRoot.id}-screen`,
      rows: screenRoot.rows,
    };

    return (
      <LayoutRenderOptionsProvider value={columnGridOptions}>
        <div
          className={[
            "flex w-full min-w-0 max-w-full flex-col",
            rootStylesResolved.className,
            rootMotionClass.className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={mergeMotionPresetStyle(
            rootStylesResolved.style,
            rootMotionClass,
          )}
        >
          <ResponsiveStyleTag cssText={rootStylesResolved.cssText} />
          {(() => {
            const explicitGap = screenRoot.gap?.trim()
              ? resolveGridGapCSSValue(screenRoot.gap, undefined)
              : undefined;
            const styleGap =
              explicitGap === undefined
                ? resolveLayoutSpacingProps(screenRoot.styles, atBreakpoint)
                : undefined;
            const gapStyleValue =
              explicitGap ??
              styleGap?.style?.gap ??
              (styleGap?.gap !== undefined && styleGap.gap !== null
                ? `${styleGap.gap}px`
                : undefined);

            return (
              <div
                className={styleGap?.className}
                style={{
                  display: "grid",
                  gridTemplateColumns: normalizeGridTemplateColumnsForCss(
                    screenRoot.gridTemplateColumns,
                  ),
                  ...(gapStyleValue !== undefined
                    ? { gap: gapStyleValue }
                    : {}),
                  alignItems: screenRoot.alignItems,
                }}
              >
                <ResponsiveStyleTag cssText={styleGap?.cssText} />
                {renderGridTrackRows(
                  screenRoot.rows,
                  context,
                  atBreakpoint,
                  { rootColumnIndex: 0 },
                  0,
                  syntheticColumn,
                  columnGridOptions,
                )}
              </div>
            );
          })()}
        </div>
      </LayoutRenderOptionsProvider>
    );
  }

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
  const rootStylesResolved = resolveRowWrapperStyleRules(layout.root.styles, {
    baseClassName: className,
    atBreakpoint,
  });
  const columnGridOptions: ColumnGridRenderOptions = {
    rootColumnWrapper,
    nestedColumnWrapper,
    rowWrapper,
    renderEmptyRootColumns,
    stretchRootColumns,
  };

  if (
    !usesResponsiveGridLayout(layout.root.styles, layout.root.columnCount) &&
    usesFlexWrapLayout(layout.root.styles, atBreakpoint)
  ) {
    return (
      <LayoutRenderOptionsProvider value={columnGridOptions}>
        <div
          className={[
            fillRootClass,
            rootStylesResolved.className,
            rootMotionClass.className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={mergeMotionPresetStyle(
            rootStylesResolved.style,
            rootMotionClass,
          )}
        >
          <ResponsiveStyleTag cssText={rootStylesResolved.cssText} />
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
          rootMotionClass.className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={mergeMotionPresetStyle(
          rootStylesResolved.style,
          rootMotionClass,
        )}
      >
        <ResponsiveStyleTag cssText={rootStylesResolved.cssText} />
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
