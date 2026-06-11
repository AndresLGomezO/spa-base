import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { FormDesignerComponentsLabels } from "./form-designer-components-labels";
import { FormDesignerStructureTreeInsertSlot } from "./FormDesignerStructureTreeInsertSlot";
import { FormDesignerStructureTreeNode } from "./FormDesignerStructureTreeNode";
import {
  buildStructureTree,
  collectDefaultExpandedNodeIds,
  createColumnTopInsertAnchor,
  createRowBottomInsertAnchor,
  getRowMoveState,
  type InsertAnchor,
  type StructureColumnNode,
  type StructureRowNode,
} from "./form-designer-structure-tree";
import type { FieldDescriptor } from "@repo/ui-builder-react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import {
  areComponentColumnRefsEqual,
  toComponentColumnRef,
  type ComponentColumnRef,
} from "./form-designer-component-column-ref";
import {
  areComponentRowRefsEqual,
  toComponentRowRef,
  type ComponentRowRef,
} from "./form-designer-component-row-ref";

interface FormDesignerStructureTreeProps {
  readonly layout: UiLayoutDocument;
  readonly labels: FormDesignerComponentsLabels;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly onInsert: (anchor: InsertAnchor) => void;
  readonly onMoveRowUp: (row: StructureRowNode) => void;
  readonly onMoveRowDown: (row: StructureRowNode) => void;
  readonly onRemoveRow: (row: StructureRowNode) => void;
  readonly focusedRow?: ComponentRowRef | null;
  readonly focusedColumn?: ComponentColumnRef | null;
  readonly onRowHover?: (row: ComponentRowRef | null) => void;
  readonly onRowSelect?: (row: StructureRowNode) => void;
  readonly onColumnHover?: (column: ComponentColumnRef | null) => void;
  readonly onColumnSelect?: (column: StructureColumnNode) => void;
}

function CollapsibleChildren({
  expanded,
  children,
}: {
  readonly expanded: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className="flex flex-col">{children}</div>
      </div>
    </div>
  );
}

function StructureRowBranch({
  row,
  depth,
  layout,
  labels,
  expandedIds,
  onToggle,
  onInsert,
  onMoveRowUp,
  onMoveRowDown,
  onRemoveRow,
  focusedRow,
  focusedColumn,
  onRowHover,
  onRowSelect,
  onColumnHover,
  onColumnSelect,
}: {
  readonly row: StructureRowNode;
  readonly depth: number;
  readonly layout: UiLayoutDocument;
  readonly labels: FormDesignerComponentsLabels;
  readonly expandedIds: ReadonlySet<string>;
  readonly onToggle: (id: string) => void;
  readonly onInsert: (anchor: InsertAnchor) => void;
  readonly onMoveRowUp: (row: StructureRowNode) => void;
  readonly onMoveRowDown: (row: StructureRowNode) => void;
  readonly onRemoveRow: (row: StructureRowNode) => void;
  readonly focusedRow?: ComponentRowRef | null;
  readonly focusedColumn?: ComponentColumnRef | null;
  readonly onRowHover?: (row: ComponentRowRef | null) => void;
  readonly onRowSelect?: (row: StructureRowNode) => void;
  readonly onColumnHover?: (column: ComponentColumnRef | null) => void;
  readonly onColumnSelect?: (column: StructureColumnNode) => void;
}) {
  const isNested = row.type === "nested-layout";
  const expanded = expandedIds.has(row.id);
  const kind = isNested ? "nested-layout" : row.kind;
  const moveState = getRowMoveState(layout, row);
  const rowRef = toComponentRowRef(row.rowId, row.locator);
  const hasRowFocus = focusedRow != null;
  const hasColumnFocus = focusedColumn != null;
  const rowFocusState = areComponentRowRefsEqual(focusedRow, rowRef)
    ? "focused"
    : hasRowFocus || hasColumnFocus
      ? "dimmed"
      : "none";

  return (
    <div className="group/branch flex w-max min-w-full flex-col">
      <FormDesignerStructureTreeNode
        id={row.id}
        label={row.label}
        kind={kind}
        depth={depth}
        expanded={expanded}
        expandable={isNested}
        expandAriaLabel={labels.expandNode(row.label)}
        collapseAriaLabel={labels.collapseNode(row.label)}
        onToggle={() => onToggle(row.id)}
        showRowActions
        canMoveUp={moveState.canMoveUp}
        canMoveDown={moveState.canMoveDown}
        moveUpLabel={labels.moveRowUp}
        moveDownLabel={labels.moveRowDown}
        deleteLabel={labels.deleteRow}
        onMoveUp={() => onMoveRowUp(row)}
        onMoveDown={() => onMoveRowDown(row)}
        onDelete={() => onRemoveRow(row)}
        rowFocusState={rowFocusState}
        onRowHover={() => onRowHover?.(rowRef)}
        onRowLeave={() => onRowHover?.(null)}
        onRowSelect={() => onRowSelect?.(row)}
      />

      {isNested ? (
        <CollapsibleChildren expanded={expanded}>
          <div className="border-border/60 ml-3 w-max min-w-full border-l pl-1.5">
            {row.columns.map((column) => (
              <StructureColumnBranch
                key={column.id}
                column={column}
                depth={depth + 1}
                layout={layout}
                labels={labels}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onInsert={onInsert}
                onMoveRowUp={onMoveRowUp}
                onMoveRowDown={onMoveRowDown}
                onRemoveRow={onRemoveRow}
                focusedRow={focusedRow}
                focusedColumn={focusedColumn}
                onRowHover={onRowHover}
                onRowSelect={onRowSelect}
                onColumnHover={onColumnHover}
                onColumnSelect={onColumnSelect}
              />
            ))}
          </div>
        </CollapsibleChildren>
      ) : null}

      <FormDesignerStructureTreeInsertSlot
        ariaLabel={labels.insertBelow(row.label)}
        anchor={createRowBottomInsertAnchor(row)}
        onInsert={onInsert}
      />
    </div>
  );
}

function StructureColumnBranch({
  column,
  depth,
  layout,
  labels,
  expandedIds,
  onToggle,
  onInsert,
  onMoveRowUp,
  onMoveRowDown,
  onRemoveRow,
  focusedRow,
  focusedColumn,
  onRowHover,
  onRowSelect,
  onColumnHover,
  onColumnSelect,
}: {
  readonly column: StructureColumnNode;
  readonly depth: number;
  readonly layout: UiLayoutDocument;
  readonly labels: FormDesignerComponentsLabels;
  readonly expandedIds: ReadonlySet<string>;
  readonly onToggle: (id: string) => void;
  readonly onInsert: (anchor: InsertAnchor) => void;
  readonly onMoveRowUp: (row: StructureRowNode) => void;
  readonly onMoveRowDown: (row: StructureRowNode) => void;
  readonly onRemoveRow: (row: StructureRowNode) => void;
  readonly focusedRow?: ComponentRowRef | null;
  readonly focusedColumn?: ComponentColumnRef | null;
  readonly onRowHover?: (row: ComponentRowRef | null) => void;
  readonly onRowSelect?: (row: StructureRowNode) => void;
  readonly onColumnHover?: (column: ComponentColumnRef | null) => void;
  readonly onColumnSelect?: (column: StructureColumnNode) => void;
}) {
  const expanded = expandedIds.has(column.id);
  const columnRef = toComponentColumnRef(column);
  const hasRowFocus = focusedRow != null;
  const hasColumnFocus = focusedColumn != null;
  const columnFocusState = areComponentColumnRefsEqual(focusedColumn, columnRef)
    ? "focused"
    : hasRowFocus || hasColumnFocus
      ? "dimmed"
      : "none";

  return (
    <div className="group/branch flex w-max min-w-full flex-col">
      <FormDesignerStructureTreeNode
        id={column.id}
        label={column.label}
        kind="nested-layout"
        depth={depth}
        expanded={expanded}
        expandable
        expandAriaLabel={labels.expandNode(column.label)}
        collapseAriaLabel={labels.collapseNode(column.label)}
        onToggle={() => onToggle(column.id)}
        rowFocusState={columnFocusState}
        onRowHover={() => onColumnHover?.(columnRef)}
        onRowLeave={() => onColumnHover?.(null)}
        onRowSelect={() => onColumnSelect?.(column)}
      />

      <CollapsibleChildren expanded={expanded}>
        <div className="border-border/60 ml-3 w-max min-w-full border-l pl-1.5">
          {column.rows.length === 0 ? (
            <div className="flex flex-col px-2 py-1">
              <Text className="text-muted-foreground text-xs">
                {labels.emptyColumn}
              </Text>
              <FormDesignerStructureTreeInsertSlot
                ariaLabel={labels.insertInColumn(column.label)}
                anchor={createColumnTopInsertAnchor(column)}
                onInsert={onInsert}
              />
            </div>
          ) : (
            <>
              <FormDesignerStructureTreeInsertSlot
                ariaLabel={labels.insertInColumn(column.label)}
                anchor={createColumnTopInsertAnchor(column)}
                onInsert={onInsert}
              />
              {column.rows.map((row) => (
                <StructureRowBranch
                  key={row.id}
                  row={row}
                  depth={depth + 1}
                  layout={layout}
                  labels={labels}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  onInsert={onInsert}
                  onMoveRowUp={onMoveRowUp}
                  onMoveRowDown={onMoveRowDown}
                  onRemoveRow={onRemoveRow}
                  focusedRow={focusedRow}
                  focusedColumn={focusedColumn}
                  onRowHover={onRowHover}
                  onRowSelect={onRowSelect}
                  onColumnHover={onColumnHover}
                  onColumnSelect={onColumnSelect}
                />
              ))}
            </>
          )}
        </div>
      </CollapsibleChildren>
    </div>
  );
}

export function FormDesignerStructureTree({
  layout,
  labels,
  fieldDescriptors,
  onInsert,
  onMoveRowUp,
  onMoveRowDown,
  onRemoveRow,
  focusedRow = null,
  focusedColumn = null,
  onRowHover,
  onRowSelect,
  onColumnHover,
  onColumnSelect,
}: FormDesignerStructureTreeProps) {
  const columns = useMemo(
    () => buildStructureTree(layout, labels.tree, fieldDescriptors),
    [fieldDescriptors, labels.tree, layout],
  );

  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => {
    return new Set(collectDefaultExpandedNodeIds(columns));
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div
      role="tree"
      aria-label={labels.panelTitle}
      className="flex w-max min-w-full flex-col gap-1 py-1"
    >
      {columns.map((column) => (
        <StructureColumnBranch
          key={column.id}
          column={column}
          depth={0}
          layout={layout}
          labels={labels}
          expandedIds={expandedIds}
          onToggle={handleToggle}
          onInsert={onInsert}
          onMoveRowUp={onMoveRowUp}
          onMoveRowDown={onMoveRowDown}
          onRemoveRow={onRemoveRow}
          focusedRow={focusedRow}
          focusedColumn={focusedColumn}
          onRowHover={onRowHover}
          onRowSelect={onRowSelect}
          onColumnHover={onColumnHover}
          onColumnSelect={onColumnSelect}
        />
      ))}
    </div>
  );
}
