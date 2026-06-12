import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { FormDesignerComponentsLabels } from "./form-designer-components-labels";
import { FormDesignerStructureTreeInsertSlot } from "./FormDesignerStructureTreeInsertSlot";
import { FormDesignerStructureTreeNode } from "./FormDesignerStructureTreeNode";
import { FormDesignerStructureTreeUtilNode } from "./FormDesignerStructureTreeUtilNode";
import {
  buildStructureTree,
  collectDefaultExpandedNodeIdsForLayout,
  createColumnTopInsertAnchor,
  createRowBottomInsertAnchor,
  getRowMoveState,
  resolvePromotedNestedLayoutRootRow,
  type InsertAnchor,
  type StructureColumnNode,
  type StructureNestedLayoutRowNode,
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

type TreeRowFocusState = "focused" | "selected" | "dimmed" | "none";
type StructureTreeVariant = "full" | "util";

const FLYOUT_CLOSE_DELAY_MS = 150;

interface TreeFocusProps {
  readonly hoveredRow?: ComponentRowRef | null;
  readonly hoveredColumn?: ComponentColumnRef | null;
  readonly selectedRow?: ComponentRowRef | null;
  readonly selectedColumn?: ComponentColumnRef | null;
  readonly componentRowPanelOpen?: boolean;
}

interface BranchSharedProps {
  readonly layout: UiLayoutDocument;
  readonly labels: FormDesignerComponentsLabels;
  readonly treeFocus: TreeFocusProps;
  readonly expandedIds: ReadonlySet<string>;
  readonly onToggle: (id: string) => void;
  readonly onInsert: (anchor: InsertAnchor) => void;
  readonly insertDisabled?: boolean;
  readonly onMoveRowUp: (row: StructureRowNode) => void;
  readonly onMoveRowDown: (row: StructureRowNode) => void;
  readonly onRemoveRow: (row: StructureRowNode) => void;
  readonly onRowHover?: (row: ComponentRowRef | null) => void;
  readonly onRowSelect?: (row: StructureRowNode) => void;
  readonly onColumnHover?: (column: ComponentColumnRef | null) => void;
  readonly onColumnSelect?: (column: StructureColumnNode) => void;
}

interface FormDesignerStructureTreeProps extends TreeFocusProps {
  readonly layout: UiLayoutDocument;
  readonly labels: FormDesignerComponentsLabels;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly variant?: StructureTreeVariant;
  readonly flattenSingleRootColumn?: boolean;
  readonly promoteSingleNestedLayoutRoot?: boolean;
  readonly onInsert: (anchor: InsertAnchor) => void;
  readonly insertDisabled?: boolean;
  readonly onMoveRowUp: (row: StructureRowNode) => void;
  readonly onMoveRowDown: (row: StructureRowNode) => void;
  readonly onRemoveRow: (row: StructureRowNode) => void;
  readonly onRowHover?: (row: ComponentRowRef | null) => void;
  readonly onRowSelect?: (row: StructureRowNode) => void;
  readonly onColumnHover?: (column: ComponentColumnRef | null) => void;
  readonly onColumnSelect?: (column: StructureColumnNode) => void;
}

function resolveRowFocusState(
  rowRef: ComponentRowRef,
  {
    hoveredRow = null,
    selectedRow = null,
    hoveredColumn = null,
    selectedColumn = null,
    componentRowPanelOpen = false,
  }: TreeFocusProps,
): TreeRowFocusState {
  if (areComponentRowRefsEqual(hoveredRow, rowRef)) {
    return "focused";
  }

  if (
    componentRowPanelOpen &&
    selectedColumn == null &&
    areComponentRowRefsEqual(selectedRow, rowRef)
  ) {
    return "selected";
  }

  const hasActiveContext =
    hoveredRow != null ||
    hoveredColumn != null ||
    (componentRowPanelOpen && (selectedRow != null || selectedColumn != null));

  return hasActiveContext ? "dimmed" : "none";
}

function resolveColumnFocusState(
  columnRef: ComponentColumnRef,
  {
    hoveredRow = null,
    selectedRow = null,
    hoveredColumn = null,
    selectedColumn = null,
    componentRowPanelOpen = false,
  }: TreeFocusProps,
): TreeRowFocusState {
  if (areComponentColumnRefsEqual(hoveredColumn, columnRef)) {
    return "focused";
  }

  if (
    componentRowPanelOpen &&
    areComponentColumnRefsEqual(selectedColumn, columnRef)
  ) {
    return "selected";
  }

  const hasActiveContext =
    hoveredRow != null ||
    hoveredColumn != null ||
    (componentRowPanelOpen && (selectedRow != null || selectedColumn != null));

  return hasActiveContext ? "dimmed" : "none";
}

function areRowActionsEnabled(
  rowRef: ComponentRowRef,
  treeFocus: TreeFocusProps,
): boolean {
  if (!treeFocus.componentRowPanelOpen) {
    return true;
  }

  return (
    treeFocus.selectedColumn == null &&
    treeFocus.selectedRow != null &&
    areComponentRowRefsEqual(treeFocus.selectedRow, rowRef)
  );
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

function StructureColumnBody({
  column,
  depth,
  layout,
  labels,
  expandedIds,
  onToggle,
  onInsert,
  insertDisabled = false,
  onMoveRowUp,
  onMoveRowDown,
  onRemoveRow,
  treeFocus,
  onRowHover,
  onRowSelect,
  onColumnHover,
  onColumnSelect,
  plain = false,
}: BranchSharedProps & {
  readonly column: StructureColumnNode;
  readonly depth: number;
  readonly plain?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-max",
        !plain && "border-border/60 ml-3 border-l pl-1.5",
      )}
    >
      {column.rows.length === 0 ? (
        <div className="flex flex-col px-2 py-1">
          <Text className="text-muted-foreground text-xs">
            {labels.emptyColumn}
          </Text>
          <FormDesignerStructureTreeInsertSlot
            ariaLabel={labels.insertInColumn(column.label)}
            anchor={createColumnTopInsertAnchor(column)}
            disabled={insertDisabled}
            onInsert={onInsert}
          />
        </div>
      ) : (
        <>
          <FormDesignerStructureTreeInsertSlot
            ariaLabel={labels.insertInColumn(column.label)}
            anchor={createColumnTopInsertAnchor(column)}
            disabled={insertDisabled}
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
              insertDisabled={insertDisabled}
              onInsert={onInsert}
              onMoveRowUp={onMoveRowUp}
              onMoveRowDown={onMoveRowDown}
              onRemoveRow={onRemoveRow}
              treeFocus={treeFocus}
              onRowHover={onRowHover}
              onRowSelect={onRowSelect}
              onColumnHover={onColumnHover}
              onColumnSelect={onColumnSelect}
            />
          ))}
        </>
      )}
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
  insertDisabled = false,
  onMoveRowUp,
  onMoveRowDown,
  onRemoveRow,
  treeFocus,
  onRowHover,
  onRowSelect,
  onColumnHover,
  onColumnSelect,
}: BranchSharedProps & {
  readonly row: StructureRowNode;
  readonly depth: number;
}) {
  const isNested = row.type === "nested-layout";
  const expanded = expandedIds.has(row.id);
  const kind = isNested ? "nested-layout" : row.kind;
  const moveState = getRowMoveState(layout, row);
  const rowRef = toComponentRowRef(row.rowId, row.locator);
  const rowFocusState = resolveRowFocusState(rowRef, treeFocus);
  const rowActionsEnabled = areRowActionsEnabled(rowRef, treeFocus);

  return (
    <div className="group/branch flex w-full min-w-max flex-col">
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
        rowActionsEnabled={rowActionsEnabled}
        onRowHover={() => onRowHover?.(rowRef)}
        onRowLeave={() => onRowHover?.(null)}
        onRowSelect={() => onRowSelect?.(row)}
      />

      {isNested ? (
        <CollapsibleChildren expanded={expanded}>
          <div className="border-border/60 ml-3 w-full min-w-max border-l pl-1.5">
            {row.columns.map((column) => (
              <StructureColumnBranch
                key={column.id}
                column={column}
                depth={depth + 1}
                layout={layout}
                labels={labels}
                expandedIds={expandedIds}
                onToggle={onToggle}
                insertDisabled={insertDisabled}
                onInsert={onInsert}
                onMoveRowUp={onMoveRowUp}
                onMoveRowDown={onMoveRowDown}
                onRemoveRow={onRemoveRow}
                treeFocus={treeFocus}
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
        disabled={insertDisabled}
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
  insertDisabled = false,
  onMoveRowUp,
  onMoveRowDown,
  onRemoveRow,
  treeFocus,
  onRowHover,
  onRowSelect,
  onColumnHover,
  onColumnSelect,
}: BranchSharedProps & {
  readonly column: StructureColumnNode;
  readonly depth: number;
}) {
  const expanded = expandedIds.has(column.id);
  const columnRef = toComponentColumnRef(column);
  const columnFocusState = resolveColumnFocusState(columnRef, treeFocus);

  return (
    <div className="group/branch flex w-full min-w-max flex-col">
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
        <StructureColumnBody
          column={column}
          depth={depth}
          layout={layout}
          labels={labels}
          expandedIds={expandedIds}
          onToggle={onToggle}
          insertDisabled={insertDisabled}
          onInsert={onInsert}
          onMoveRowUp={onMoveRowUp}
          onMoveRowDown={onMoveRowDown}
          onRemoveRow={onRemoveRow}
          treeFocus={treeFocus}
          onRowHover={onRowHover}
          onRowSelect={onRowSelect}
          onColumnHover={onColumnHover}
          onColumnSelect={onColumnSelect}
        />
      </CollapsibleChildren>
    </div>
  );
}

function FormDesignerStructureUtilTree({
  columns,
  branchProps,
  onColumnHover,
  onColumnSelect,
  promotedNestedLayoutRoot = null,
}: {
  readonly columns: readonly StructureColumnNode[];
  readonly branchProps: BranchSharedProps;
  readonly onColumnHover?: (column: ComponentColumnRef | null) => void;
  readonly onColumnSelect?: (column: StructureColumnNode) => void;
  readonly promotedNestedLayoutRoot?: StructureNestedLayoutRowNode | null;
}) {
  const closeFlyoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);

  const clearFlyoutCloseTimer = useCallback(() => {
    if (closeFlyoutTimerRef.current) {
      clearTimeout(closeFlyoutTimerRef.current);
      closeFlyoutTimerRef.current = null;
    }
  }, []);

  const handleFlyoutOpenChange = useCallback(
    (id: string, open: boolean) => {
      clearFlyoutCloseTimer();
      if (open) {
        setOpenFlyoutId(id);
        return;
      }

      closeFlyoutTimerRef.current = setTimeout(() => {
        setOpenFlyoutId((current) => (current === id ? null : current));
      }, FLYOUT_CLOSE_DELAY_MS);
    },
    [clearFlyoutCloseTimer],
  );

  return (
    <div
      role="tree"
      aria-label={branchProps.labels.panelTitle}
      className="flex w-full flex-col items-center gap-1 py-1"
    >
      {promotedNestedLayoutRoot
        ? (() => {
            const rowRef = toComponentRowRef(
              promotedNestedLayoutRoot.rowId,
              promotedNestedLayoutRoot.locator,
            );
            const rowFocusState = resolveRowFocusState(
              rowRef,
              branchProps.treeFocus,
            );

            return (
              <FormDesignerStructureTreeUtilNode
                id={promotedNestedLayoutRoot.id}
                label={promotedNestedLayoutRoot.label}
                kind="nested-layout"
                rowFocusState={rowFocusState}
                flyoutOpen={openFlyoutId === promotedNestedLayoutRoot.id}
                onFlyoutOpenChange={(open) =>
                  handleFlyoutOpenChange(promotedNestedLayoutRoot.id, open)
                }
                onHover={() => branchProps.onRowHover?.(rowRef)}
                onLeave={() => branchProps.onRowHover?.(null)}
                onSelect={() =>
                  branchProps.onRowSelect?.(promotedNestedLayoutRoot)
                }
              >
                {promotedNestedLayoutRoot.columns.map((column) => (
                  <StructureColumnBody
                    key={column.id}
                    column={column}
                    depth={1}
                    {...branchProps}
                  />
                ))}
              </FormDesignerStructureTreeUtilNode>
            );
          })()
        : columns.map((column) => {
            const columnRef = toComponentColumnRef(column);
            const columnFocusState = resolveColumnFocusState(
              columnRef,
              branchProps.treeFocus,
            );

            return (
              <FormDesignerStructureTreeUtilNode
                key={column.id}
                id={column.id}
                label={column.label}
                kind="nested-layout"
                rowFocusState={columnFocusState}
                flyoutOpen={openFlyoutId === column.id}
                onFlyoutOpenChange={(open) =>
                  handleFlyoutOpenChange(column.id, open)
                }
                onHover={() => onColumnHover?.(columnRef)}
                onLeave={() => onColumnHover?.(null)}
                onSelect={() => onColumnSelect?.(column)}
              >
                <StructureColumnBody
                  column={column}
                  depth={0}
                  {...branchProps}
                />
              </FormDesignerStructureTreeUtilNode>
            );
          })}
    </div>
  );
}

export function FormDesignerStructureTree({
  layout,
  labels,
  fieldDescriptors,
  variant = "full",
  flattenSingleRootColumn = false,
  promoteSingleNestedLayoutRoot = false,
  onInsert,
  insertDisabled = false,
  onMoveRowUp,
  onMoveRowDown,
  onRemoveRow,
  hoveredRow = null,
  hoveredColumn = null,
  selectedRow = null,
  selectedColumn = null,
  componentRowPanelOpen = false,
  onRowHover,
  onRowSelect,
  onColumnHover,
  onColumnSelect,
}: FormDesignerStructureTreeProps) {
  const treeFocus = useMemo(
    (): TreeFocusProps => ({
      hoveredRow,
      hoveredColumn,
      selectedRow,
      selectedColumn,
      componentRowPanelOpen,
    }),
    [
      componentRowPanelOpen,
      hoveredColumn,
      hoveredRow,
      selectedColumn,
      selectedRow,
    ],
  );
  const columns = useMemo(
    () => buildStructureTree(layout, labels.tree, fieldDescriptors),
    [fieldDescriptors, labels.tree, layout],
  );

  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => {
    return new Set(
      collectDefaultExpandedNodeIdsForLayout(columns, {
        promoteSingleNestedLayoutRoot,
      }),
    );
  });

  const promotedNestedLayoutRoot = useMemo(() => {
    if (!promoteSingleNestedLayoutRoot) {
      return null;
    }

    return resolvePromotedNestedLayoutRootRow(columns);
  }, [columns, promoteSingleNestedLayoutRoot]);

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

  const branchProps: BranchSharedProps = {
    layout,
    labels,
    treeFocus,
    expandedIds,
    onToggle: handleToggle,
    insertDisabled,
    onInsert,
    onMoveRowUp,
    onMoveRowDown,
    onRemoveRow,
    onRowHover,
    onRowSelect,
    onColumnHover,
    onColumnSelect,
  };

  if (variant === "util") {
    return (
      <FormDesignerStructureUtilTree
        columns={columns}
        branchProps={branchProps}
        onColumnHover={onColumnHover}
        onColumnSelect={onColumnSelect}
        promotedNestedLayoutRoot={promotedNestedLayoutRoot}
      />
    );
  }

  const shouldFlattenRootColumn =
    flattenSingleRootColumn &&
    columns.length === 1 &&
    !promotedNestedLayoutRoot;
  const flattenedColumn = shouldFlattenRootColumn ? columns[0] : null;

  return (
    <div
      role="tree"
      aria-label={labels.panelTitle}
      className="flex w-max min-w-full flex-col gap-1 py-1"
    >
      {promotedNestedLayoutRoot ? (
        <StructureRowBranch
          row={promotedNestedLayoutRoot}
          depth={0}
          {...branchProps}
        />
      ) : flattenedColumn ? (
        <StructureColumnBody
          column={flattenedColumn}
          depth={0}
          plain
          {...branchProps}
        />
      ) : (
        columns.map((column) => (
          <StructureColumnBranch
            key={column.id}
            column={column}
            depth={0}
            {...branchProps}
          />
        ))
      )}
    </div>
  );
}
