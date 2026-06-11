import type { CSSProperties, ReactNode } from "react";
import {
  buildGridTemplateColumnsFromPercents,
  buildDisplayRangeClassName,
  columnFlexBasisStyle,
  componentSlotWrapperClassName,
  flexWrapClassFromStyles,
  gapPxFromStyles,
  isVisibleAtBreakpoint,
  parseFlexLayoutFromStyles,
  resolveColumnStackDirection,
  resolveColumnWidthPercents,
  resolveResponsiveGridLayout,
  resolveStyleRules,
  usesFlexWrapLayout,
  usesResponsiveGridLayout,
  usesTextWrap,
  type ColumnNode,
  type ColumnStackDirection,
  type ResponsiveGridBreakpoint,
  type RowLocator,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { LayoutGrid, LayoutStack } from "@repo/ui";

import type { LayoutRenderContext } from "../context.js";
import { renderUiComponent } from "../engine/render-component.js";
import { resolveMotionPreset } from "../motion/resolve-motion.js";
import { usePreviewBreakpoint } from "../preview-breakpoint-context.js";

/** Fills the grid/flex column cell so backgrounds and padding cover the full slot. */
const COLUMN_SHELL_CLASS = "flex h-full min-h-0 w-full min-w-0 flex-col";
const FORM_COLUMN_SHELL_CLASS = "flex w-full min-w-0 flex-col";
const STRETCHED_COLUMN_SHELL_SUFFIX = "h-full min-h-0 self-stretch";
const WIZARD_FORM_COLUMN_SHELL_CLASS =
  "flex min-h-0 min-w-0 flex-col overflow-hidden";

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

function columnShellClassName(
  context: LayoutRenderContext,
  column?: ColumnNode,
  stretchColumn = false,
): string {
  const baseClass = (() => {
    if (context.mode === "mainPage") {
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
  readonly nestedParentRowId?: string;
  readonly nestedColumnIndex?: number;
}

function buildRowLocator(scope: RowRenderScope): RowLocator {
  if (scope.nestedParentRowId != null && scope.nestedColumnIndex != null) {
    return {
      scope: "nested",
      columnIndex: scope.rootColumnIndex,
      rowId: scope.nestedParentRowId,
      nestedColumnIndex: scope.nestedColumnIndex,
    };
  }

  return { scope: "root", columnIndex: scope.rootColumnIndex };
}

export interface NestedColumnWrapperContext {
  readonly rootColumnIndex: number;
  readonly nestedParentRowId: string;
}

interface ColumnGridRenderOptions {
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly nestedColumnWrapper?: NestedColumnWrapper;
  readonly rowWrapper?: RowWrapper;
  readonly renderEmptyRootColumns?: boolean;
  readonly stretchRootColumns?: boolean;
}

function nestedColumnGridOptions(
  options?: ColumnGridRenderOptions,
): ColumnGridRenderOptions | undefined {
  if (options === undefined) {
    return undefined;
  }

  return {
    rowWrapper: options.rowWrapper,
    nestedColumnWrapper: options.nestedColumnWrapper,
    renderEmptyRootColumns: options.renderEmptyRootColumns,
    stretchRootColumns: options.stretchRootColumns,
  };
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
    stretchColumn: isMultiColumn || (options?.stretchRootColumns ?? false),
  };
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

  return (
    <LayoutStack
      direction={stackDirection}
      gap={gapPxFromStyles(column.styles)}
      className={[
        "flex w-full min-w-0",
        isMainPage && stackDirection === "column" && "min-h-0 flex-1",
        isMainPage && stackDirection === "column"
          ? "h-full overflow-hidden"
          : "",
        isWizardForm && stackDirection === "column" && "min-h-0 w-full",
        isWizardStepContent && stackDirection === "column" && "min-h-0 w-full",
        stretchColumn && stackDirection === "column" && "min-h-0 flex-1 h-full",
        stackDirection === "column" ? "flex-col" : "flex-row",
        flexWrapClassFromStyles(column.styles),
      ]
        .filter(Boolean)
        .join(" ")}
      align={columnFlex.align}
      justify={columnFlex.justify}
    >
      {rows.map((row, rowIndex) =>
        renderRow(
          row,
          context,
          stackDirection,
          atBreakpoint,
          rowScope,
          rowIndex + rowMotionIndexOffset,
          columnGridOptions,
        ),
      )}
    </LayoutStack>
  );
}

function rowStackShellClassName(
  stackDirection: ColumnStackDirection,
  componentStyles?: readonly import("@repo/ui-builder-core").StyleRule[],
): string | undefined {
  if (stackDirection !== "row") {
    return undefined;
  }

  if (usesTextWrap(componentStyles)) {
    return "min-w-0 w-full shrink";
  }

  return "min-w-0 shrink-0";
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
  const shouldStretch = stretchRootColumns || stretchColumns;
  const stretchSuffix = shouldStretch ? " h-full min-h-0" : "";

  if (isMainPage) {
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
  },
): RowRenderScope {
  if (nestedContext) {
    return {
      rootColumnIndex: nestedContext.rootColumnIndex,
      nestedParentRowId: nestedContext.nestedParentRowId,
      nestedColumnIndex: columnIndex,
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
  const responsiveLayout = resolveResponsiveGridLayout({
    styles,
    columnCount,
    slotCount: columnCount,
    columns,
    atBreakpoint,
  });
  const stretchClass = layoutGridStretchClassName(
    context,
    options?.stretchRootColumns,
    columnRenderFlags.stretchColumn,
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
          ...columnRenderFlags,
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

    return (
      <LayoutGrid
        direction="row"
        display="grid"
        gap={gapPxFromStyles(styles)}
        align="stretch"
        className={[stretchClass, responsiveLayout.className]
          .filter(Boolean)
          .join(" ")}
        style={proportionalStyle}
      >
        {columns.map((column, index) => renderColumnNode(column, index))}
      </LayoutGrid>
    );
  }

  if (responsiveLayout.mode === "autoFit") {
    return (
      <LayoutGrid
        direction="row"
        gap={gapPxFromStyles(styles)}
        columns={responsiveLayout.columnsTemplate}
        align="stretch"
        className={stretchClass}
      >
        {columns.map((column, index) => renderColumnNode(column, index))}
      </LayoutGrid>
    );
  }

  return (
    <LayoutGrid
      direction="row"
      gap={gapPxFromStyles(styles)}
      columns={
        responsiveLayout.columnsTemplate ??
        buildGridTemplateColumnsFromPercents(
          resolveColumnWidthPercents(columns),
        )
      }
      align="stretch"
      className={stretchClass}
    >
      {columns.map((column, index) => renderColumnNode(column, index))}
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
  const percents = resolveColumnWidthPercents(columns);
  const gap = gapPxFromStyles(styles);

  return (
    <LayoutStack
      direction="row"
      gap={gap}
      className={[
        "flex w-full min-w-0",
        columnRenderFlags.stretchColumn && "h-full min-h-0",
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
            ...columnRenderFlags,
            flexBasisPercent: percents[index],
            columnGridOptions: options,
          },
        );
        if (!columnContent) {
          return null;
        }

        return wrapColumn(index, column, columnContent, options, nestedContext);
      })}
    </LayoutStack>
  );
}

function resolveDisplayRangeVisibility(
  displayFrom: ResponsiveGridBreakpoint | undefined,
  displayTo: ResponsiveGridBreakpoint | undefined,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  displayClassName: "flex" | "block",
): { readonly hidden: boolean; readonly className?: string } {
  if (
    atBreakpoint !== undefined &&
    !isVisibleAtBreakpoint(displayFrom, displayTo, atBreakpoint)
  ) {
    return { hidden: true };
  }

  return {
    hidden: false,
    className: buildDisplayRangeClassName(displayFrom, displayTo, {
      display: displayClassName,
    }),
  };
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
  columnGridOptions?: ColumnGridRenderOptions,
): ReactNode {
  const displayRange = resolveRowDisplayRange(row, atBreakpoint);
  if (displayRange.hidden) {
    return null;
  }

  const rowLocator = buildRowLocator(rowScope);
  const stackShellClass = rowStackShellClassName(stackDirection);

  if (row.type === "component") {
    const rowStyles = resolveStyleRules(row.styles);
    const motionClass = resolveMotionPreset(row.motion, rowIndex);
    const isMainPage = context.mode === "mainPage";
    const isFormFill = context.mode === "form";
    const isWizardForm = isWizardFormContext(context);
    const isWizardStepContent = isWizardStepContentContext(context);
    const isPageListRow = row.component.kind === "page-list";
    const isWizardActionsRow = row.component.kind === "wizard-actions";
    const isWizardStepHostRow = row.component.kind === "wizard-step-host";
    const isWizardProgressRow = row.component.kind === "wizard-progress";
    const isEntityFieldSelectorRow =
      row.component.kind === "entity-field-selector";
    const mainPageRowClass =
      isMainPage && stackDirection === "column"
        ? isPageListRow
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
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
    const formSlotClassName =
      isFormFill && stackDirection === "column"
        ? componentSlotWrapperClassName(row.component.styles)
            .split(/\s+/)
            .filter(
              (part) =>
                part.length > 0 &&
                !part.startsWith("flex-[") &&
                part !== "flex-1" &&
                part !== "grow",
            )
            .join(" ")
        : componentSlotWrapperClassName(row.component.styles);
    return wrapRowContent(
      row,
      rowLocator,
      <div
        key={row.id}
        className={[
          rowStackShellClassName(stackDirection, row.component.styles),
          mainPageRowClass,
          formRowClass,
          wizardActionsRowClass,
          wizardStepHostRowClass,
          wizardProgressRowClass,
          formSlotClassName,
          rowStyles.className,
          motionClass,
          displayRange.className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={rowStyles.style}
      >
        {renderUiComponent(row.component, context)}
      </div>,
      columnGridOptions,
    );
  }

  const rowStyles = resolveStyleRules(row.styles);
  const isFormFill = context.mode === "form";
  const isWizardForm = isWizardFormContext(context);
  const formNestedRowClass =
    isFormFill && stackDirection === "column"
      ? isWizardForm
        ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        : "flex w-full min-w-0 shrink-0 flex-col"
      : undefined;
  const nestedContext = {
    rootColumnIndex: rowScope.rootColumnIndex,
    nestedParentRowId: row.id,
  };

  if (
    !usesResponsiveGridLayout(row.styles, row.columnCount) &&
    usesFlexWrapLayout(row.styles)
  ) {
    return wrapRowContent(
      row,
      rowLocator,
      <div
        key={row.id}
        className={[
          stackShellClass,
          formNestedRowClass,
          rowStyles.className,
          displayRange.className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={rowStyles.style}
      >
        {renderWrappedColumns(
          row.columns,
          context,
          row.styles,
          atBreakpoint,
          row.columnCount,
          nestedColumnGridOptions(columnGridOptions),
          nestedContext,
        )}
      </div>,
      columnGridOptions,
    );
  }

  return wrapRowContent(
    row,
    rowLocator,
    <div
      key={row.id}
      className={[
        stackShellClass,
        formNestedRowClass,
        rowStyles.className,
        displayRange.className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={rowStyles.style}
    >
      {renderLayoutColumnGrid(
        row.columns,
        context,
        row.styles,
        row.columnCount,
        atBreakpoint,
        nestedColumnGridOptions(columnGridOptions),
        nestedContext,
      )}
    </div>,
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

  const columnStyles = resolveStyleRules(column.styles);
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
            nestedColumnGridOptions(options?.columnGridOptions),
          )
        : null}
    </div>
  );
}

export type RootColumnWrapper = (
  index: number,
  column: ColumnNode,
  children: ReactNode,
) => ReactNode;

export type NestedColumnWrapper = (
  nestedColumnIndex: number,
  column: ColumnNode,
  context: NestedColumnWrapperContext,
  children: ReactNode,
) => ReactNode;

export type RowWrapper = (
  row: RowNode,
  locator: RowLocator,
  children: ReactNode,
) => ReactNode;

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
  const fillRootClass = isMainPage
    ? "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    : isWizardForm || isWizardStepContent
      ? stretchRootColumns
        ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
        : "flex w-full min-w-0 flex-col"
      : isFormFill
        ? stretchRootColumns
          ? "flex h-full min-h-0 w-full min-w-0 flex-col"
          : "flex w-full min-w-0 flex-col"
        : undefined;
  const rootStylesResolved = resolveStyleRules(layout.root.styles, className);
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
    );
  }

  return (
    <div
      className={[fillRootClass, rootStylesResolved.className, rootMotionClass]
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
  );
}
