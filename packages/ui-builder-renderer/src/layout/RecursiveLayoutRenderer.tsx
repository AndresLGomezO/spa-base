import type { ReactNode } from "react";
import {
  buildGridTemplateColumnsFromPercents,
  columnFlexBasisStyle,
  componentSlotWrapperClassName,
  flexWrapClassFromStyles,
  gapPxFromStyles,
  parseFlexLayoutFromStyles,
  resolveColumnStackDirection,
  resolveColumnWidthPercents,
  resolveStyleRules,
  usesFlexWrapLayout,
  usesTextWrap,
  type ColumnNode,
  type ColumnStackDirection,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { LayoutGrid, LayoutStack } from "@repo/ui";

import type { LayoutRenderContext } from "../context.js";
import { renderUiComponent } from "../engine/render-component.js";
import { resolveMotionPreset } from "../motion/resolve-motion.js";

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
  if (isWizardFormContext(context) || isWizardStepContentContext(context)) {
    if (
      isWizardFormContext(context) &&
      column &&
      !columnContainsComponentKind(column, "wizard-step-host")
    ) {
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

function renderWrappedColumns(
  columns: readonly ColumnNode[],
  context: LayoutRenderContext,
  styles: readonly import("@repo/ui-builder-core").StyleRule[] | undefined,
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
            {renderRows(column.rows, context, column)}
          </div>
        );
      })}
    </LayoutStack>
  );
}

function renderRow(
  row: RowNode,
  context: LayoutRenderContext,
  stackDirection: ColumnStackDirection,
  rowIndex = 0,
): ReactNode {
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
  const isWizardStepContent = isWizardStepContentContext(context);
  const formNestedRowClass =
    isFormFill && stackDirection === "column"
      ? isWizardForm || isWizardStepContent
        ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        : "flex w-full min-w-0 shrink-0 flex-col"
      : undefined;
  if (usesFlexWrapLayout(row.styles)) {
    return (
      <div
        key={row.id}
        className={[stackShellClass, formNestedRowClass, rowStyles.className]
          .filter(Boolean)
          .join(" ")}
        style={rowStyles.style}
      >
        {renderWrappedColumns(row.columns, context, row.styles)}
      </div>
    );
  }

  return (
    <div
      key={row.id}
      className={[stackShellClass, formNestedRowClass, rowStyles.className]
        .filter(Boolean)
        .join(" ")}
      style={rowStyles.style}
    >
      <LayoutGrid
        direction="row"
        gap={gapPxFromStyles(row.styles)}
        columns={buildGridTemplateColumnsFromPercents(
          resolveColumnWidthPercents(row.columns),
        )}
        align="stretch"
        className={isFormFill ? "w-full items-stretch" : undefined}
      >
        {row.columns.map((column) => renderColumn(column, context))}
      </LayoutGrid>
    </div>
  );
}

function renderColumn(
  column: ColumnNode,
  context: LayoutRenderContext,
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
      {renderRows(column.rows, context, column)}
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

  if (usesFlexWrapLayout(layout.root.styles)) {
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
        {renderWrappedColumns(layout.root.columns, context, layout.root.styles)}
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
      <LayoutGrid
        direction="row"
        gap={gapPxFromStyles(layout.root.styles)}
        columns={buildGridTemplateColumnsFromPercents(
          resolveColumnWidthPercents(layout.root.columns),
        )}
        align="stretch"
        className={
          isMainPage
            ? "h-full min-h-0 w-full flex-1 items-stretch"
            : isWizardForm || isWizardStepContent
              ? "w-full items-stretch"
              : isFormFill
                ? "w-full items-stretch"
                : "min-h-0 w-full items-stretch"
        }
      >
        {layout.root.columns.map((column) => renderColumn(column, context))}
      </LayoutGrid>
    </div>
  );
}
