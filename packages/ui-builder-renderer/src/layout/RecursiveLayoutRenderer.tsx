import type { ReactNode } from "react";
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
): string {
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
}

function renderRows(
  rows: readonly RowNode[],
  context: LayoutRenderContext,
  column: ColumnNode,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  rowMotionIndexOffset = 0,
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
          rowIndex + rowMotionIndexOffset,
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

function countLayoutSlots(columns: readonly ColumnNode[]): number {
  return columns.filter((column) => column.rows.length > 0).length;
}

function layoutGridStretchClassName(context: LayoutRenderContext): string {
  const isMainPage = context.mode === "mainPage";
  const isFormFill = context.mode === "form";
  const isWizardForm = isWizardFormContext(context);
  const isWizardStepContent = isWizardStepContentContext(context);

  if (isMainPage) {
    return "h-full min-h-0 w-full flex-1 items-stretch";
  }
  if (isWizardForm || isWizardStepContent || isFormFill) {
    return "w-full items-stretch";
  }
  return "min-h-0 w-full items-stretch";
}

function renderLayoutColumnGrid(
  columns: readonly ColumnNode[],
  context: LayoutRenderContext,
  styles: readonly import("@repo/ui-builder-core").StyleRule[] | undefined,
  columnCount: number,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
): ReactNode {
  const slotCount = countLayoutSlots(columns);
  const responsiveLayout = resolveResponsiveGridLayout({
    styles,
    columnCount,
    slotCount: slotCount > 0 ? slotCount : columnCount,
    atBreakpoint,
  });
  const stretchClass = layoutGridStretchClassName(context);

  if (responsiveLayout.mode === "responsive") {
    return (
      <LayoutGrid
        direction="row"
        gap={gapPxFromStyles(styles)}
        align="stretch"
        className={[stretchClass, responsiveLayout.className]
          .filter(Boolean)
          .join(" ")}
      >
        {columns.map((column) => renderColumn(column, context, atBreakpoint))}
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
        {columns.map((column) => renderColumn(column, context, atBreakpoint))}
      </LayoutGrid>
    );
  }

  return (
    <LayoutGrid
      direction="row"
      gap={gapPxFromStyles(styles)}
      columns={buildGridTemplateColumnsFromPercents(
        resolveColumnWidthPercents(columns),
      )}
      align="stretch"
      className={stretchClass}
    >
      {columns.map((column) => renderColumn(column, context, atBreakpoint))}
    </LayoutGrid>
  );
}

function renderWrappedColumns(
  columns: readonly ColumnNode[],
  context: LayoutRenderContext,
  styles: readonly import("@repo/ui-builder-core").StyleRule[] | undefined,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
): ReactNode {
  const percents = resolveColumnWidthPercents(columns);
  const gap = gapPxFromStyles(styles);

  return (
    <LayoutStack
      direction="row"
      gap={gap}
      className={["flex w-full min-w-0", flexWrapClassFromStyles(styles)]
        .filter(Boolean)
        .join(" ")}
      align="stretch"
    >
      {columns.map((column, index) => {
        if (column.rows.length === 0) {
          return null;
        }

        const columnStyles = resolveStyleRules(column.styles);
        const flexBasis = columnFlexBasisStyle(percents[index] ?? 0);

        return (
          <div
            key={column.id}
            className={[
              columnShellClassName(context, column),
              columnStyles.className,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              ...columnStyles.style,
              ...flexBasis,
            }}
          >
            {renderRows(column.rows, context, column, atBreakpoint)}
          </div>
        );
      })}
    </LayoutStack>
  );
}

function resolveRowDisplayRange(
  row: RowNode,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
): { readonly hidden: boolean; readonly className?: string } {
  if (
    atBreakpoint !== undefined &&
    !isVisibleAtBreakpoint(row.displayFrom, row.displayTo, atBreakpoint)
  ) {
    return { hidden: true };
  }

  return {
    hidden: false,
    className: buildDisplayRangeClassName(row.displayFrom, row.displayTo, {
      display: "flex",
    }),
  };
}

function renderRow(
  row: RowNode,
  context: LayoutRenderContext,
  stackDirection: ColumnStackDirection,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  rowIndex = 0,
): ReactNode {
  const displayRange = resolveRowDisplayRange(row, atBreakpoint);
  if (displayRange.hidden) {
    return null;
  }

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
        ? "flex min-h-0 w-full min-w-0 flex-col overflow-hidden"
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
    return (
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
      </div>
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
  if (
    !usesResponsiveGridLayout(row.styles, row.columnCount) &&
    usesFlexWrapLayout(row.styles)
  ) {
    return (
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
        {renderWrappedColumns(row.columns, context, row.styles, atBreakpoint)}
      </div>
    );
  }

  return (
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
      )}
    </div>
  );
}

function renderColumn(
  column: ColumnNode,
  context: LayoutRenderContext,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
): ReactNode {
  if (column.rows.length === 0) {
    return null;
  }

  const columnStyles = resolveStyleRules(column.styles);

  return (
    <div
      key={column.id}
      className={[columnShellClassName(context, column), columnStyles.className]
        .filter(Boolean)
        .join(" ")}
      style={columnStyles.style}
    >
      {renderRows(column.rows, context, column, atBreakpoint)}
    </div>
  );
}

export interface RecursiveLayoutRendererProps {
  readonly layout: UiLayoutDocument;
  readonly context: LayoutRenderContext;
  readonly className?: string;
}

export function RecursiveLayoutRenderer({
  layout,
  context,
  className,
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
      ? "flex w-full min-w-0 flex-col"
      : isFormFill
        ? "flex w-full min-w-0 flex-col"
        : undefined;
  const rootStylesResolved = resolveStyleRules(layout.root.styles, className);

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
      )}
    </div>
  );
}
