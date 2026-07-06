import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Text } from "@repo/ui";
import {
  createDefaultTableCellLayout,
  createLayoutId,
  moveRowAt,
} from "@repo/ui-builder-core";
import { entityCardViewAdapter } from "@repo/ui-builder-react";
import { useTranslation } from "react-i18next";

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { resolveExpandableTableGroupedColumnDisplayLabel } from "../ui-builder/expandable-table-grouped-column-label";
import { FormDesignerAddComponentModal } from "../form-designer/FormDesignerAddComponentModal";
import type { ComponentCatalogEntry } from "../form-designer/form-designer-component-catalog";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import { toComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import {
  areComponentRowRefsEqual,
  toComponentRowRef,
} from "../form-designer/form-designer-component-row-ref";
import {
  insertCatalogEntryAtAnchor,
  insertImportedRowAtAnchor,
} from "../form-designer/form-designer-components-layout";
import { FormDesignerStructureTree } from "../form-designer/FormDesignerStructureTree";
import { FormDesignerStructureTreeInsertSlot } from "../form-designer/FormDesignerStructureTreeInsertSlot";
import { FormDesignerStructureTreeNode } from "../form-designer/FormDesignerStructureTreeNode";
import { FormDesignerStructureTreeUtilNode } from "../form-designer/FormDesignerStructureTreeUtilNode";
import type {
  InsertAnchor,
  StructureColumnNode,
  StructureRowNode,
} from "../form-designer/form-designer-structure-tree";
import { resolveScopeLayoutBinding } from "./item-list-designer-layout-binding";
import { useItemListDesigner } from "./item-list-designer-context";
import { useItemListDesignerStructureSession } from "./ItemListDesignerStructureSession";
import { ItemListDesignerTreePanelShell } from "./ItemListDesignerTreePanelShell";

const GROUPED_COLUMN_INSERT_ANCHOR: InsertAnchor = {
  locator: { scope: "root", columnIndex: 0 },
  position: "before",
};

const FLYOUT_CLOSE_DELAY_MS = 150;

function moveGroupedColumn<T>(
  columns: readonly T[],
  index: number,
  direction: -1 | 1,
): readonly T[] {
  const target = index + direction;
  if (target < 0 || target >= columns.length) {
    return columns;
  }
  const next = [...columns];
  const [item] = next.splice(index, 1);
  if (item === undefined) {
    return columns;
  }
  next.splice(target, 0, item);
  return next;
}

interface ColumnTreeHandlers {
  readonly binding: ReturnType<typeof resolveScopeLayoutBinding>;
  readonly handleInsert: (anchor: InsertAnchor) => void;
  readonly handleMoveRowUp: (row: StructureRowNode) => void;
  readonly handleMoveRowDown: (row: StructureRowNode) => void;
  readonly handleRemoveRow: (row: StructureRowNode) => void;
  readonly handleRowSelect: (row: StructureRowNode) => void;
  readonly handleColumnSelect: (column: StructureColumnNode) => void;
}

interface ItemListDesignerGroupedColumnsTreePanelProps {
  readonly embedded?: boolean;
  readonly embeddedVariant?: "expanded" | "collapsed";
}

export function ItemListDesignerGroupedColumnsTreePanel({
  embedded = false,
  embeddedVariant = "expanded",
}: ItemListDesignerGroupedColumnsTreePanelProps = {}) {
  const { t } = useTranslation("common");
  const {
    editor,
    structurePanelOpen,
    selectedGroupedColumnIndex,
    setActiveGroupedColumnIndex,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestGroupedColumnPanel,
    requestCloseStructurePanel,
    selectedStructureRowRef,
    selectedStructureColumnRef,
  } = useItemListDesigner();
  const {
    focusedRow,
    focusedColumn,
    selectedRow,
    selectedColumn,
    focusedGroupedColumnIndex,
    setFocusedRow,
    setFocusedColumn,
    setSelectedRow,
    setSelectedColumn,
    clearColumnHover,
    clearRowHover,
    hoverRow,
    hoverColumn,
    hoverGroupedColumn,
  } = useItemListDesignerStructureSession();
  const { getDefinition, items } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [expandedColumnIds, setExpandedColumnIds] = useState<
    ReadonlySet<string>
  >(() => new Set(editor.expandableColumns.map((column) => column.id)));
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [insertColumnIndex, setInsertColumnIndex] = useState<number | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);
  const closeFlyoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const fieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(definition, getDefinition, items).fieldDescriptors,
    [definition, getDefinition, items],
  );

  const clearFlyoutCloseTimer = useCallback(() => {
    if (closeFlyoutTimerRef.current) {
      clearTimeout(closeFlyoutTimerRef.current);
      closeFlyoutTimerRef.current = null;
    }
  }, []);

  const handleFlyoutOpenChange = useCallback(
    (columnId: string, open: boolean) => {
      clearFlyoutCloseTimer();
      if (open) {
        setOpenFlyoutId(columnId);
        return;
      }

      closeFlyoutTimerRef.current = setTimeout(() => {
        setOpenFlyoutId((current) => (current === columnId ? null : current));
      }, FLYOUT_CLOSE_DELAY_MS);
    },
    [clearFlyoutCloseTimer],
  );

  const insertColumnAt = useCallback(
    (index: number) => {
      const field =
        editor.fieldPaths[index] ??
        editor.fieldPaths[0] ??
        editor.defaultFieldPath;
      const nextColumn = {
        id: createLayoutId("column"),
        cellLayout: createDefaultTableCellLayout([field]),
      };
      editor.setExpandableColumns([
        ...editor.expandableColumns.slice(0, index),
        nextColumn,
        ...editor.expandableColumns.slice(index),
      ]);
      setExpandedColumnIds((current) => new Set([...current, nextColumn.id]));
    },
    [editor],
  );

  const handleInsertColumn = useCallback(
    (index: number) => {
      insertColumnAt(index);
    },
    [insertColumnAt],
  );

  const handleMoveColumnUp = useCallback(
    (index: number) => {
      editor.setExpandableColumns(
        moveGroupedColumn(editor.expandableColumns, index, -1),
      );
    },
    [editor],
  );

  const handleMoveColumnDown = useCallback(
    (index: number) => {
      editor.setExpandableColumns(
        moveGroupedColumn(editor.expandableColumns, index, 1),
      );
    },
    [editor],
  );

  const handleRemoveColumn = useCallback(
    (index: number) => {
      const column = editor.expandableColumns[index];
      if (!column) {
        return;
      }

      if (selectedGroupedColumnIndex === index) {
        requestCloseStructurePanel();
      }

      editor.setExpandableColumns(
        editor.expandableColumns.filter(
          (_, columnIndex) => columnIndex !== index,
        ),
      );
      setExpandedColumnIds((current) => {
        const next = new Set(current);
        next.delete(column.id);
        return next;
      });
    },
    [editor, requestCloseStructurePanel, selectedGroupedColumnIndex],
  );

  const toggleColumnExpanded = useCallback((columnId: string) => {
    setExpandedColumnIds((current) => {
      const next = new Set(current);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const handleColumnHeaderSelect = useCallback(
    (columnIndex: number, label: string) => {
      clearRowHover();
      clearColumnHover();
      setActiveGroupedColumnIndex(columnIndex);
      hoverGroupedColumn(columnIndex);
      requestGroupedColumnPanel(columnIndex, label);
    },
    [
      clearColumnHover,
      clearRowHover,
      hoverGroupedColumn,
      requestGroupedColumnPanel,
      setActiveGroupedColumnIndex,
    ],
  );

  const createColumnTreeHandlers = useCallback(
    (columnIndex: number): ColumnTreeHandlers => {
      const scope = {
        kind: "groupedColumnCell" as const,
        columnIndex,
      };
      const binding = resolveScopeLayoutBinding(editor, scope);

      const activateColumn = () => {
        setActiveGroupedColumnIndex(columnIndex);
      };

      const handleInsert = (anchor: InsertAnchor) => {
        activateColumn();
        setInsertColumnIndex(columnIndex);
        setInsertAnchor(anchor);
        setModalOpen(true);
      };

      const handleMoveRowUp = (row: StructureRowNode) => {
        activateColumn();
        binding.setLayout(
          moveRowAt(binding.layout, row.locator, row.rowId, -1),
        );
      };

      const handleMoveRowDown = (row: StructureRowNode) => {
        activateColumn();
        binding.setLayout(moveRowAt(binding.layout, row.locator, row.rowId, 1));
      };

      const handleRemoveRow = (row: StructureRowNode) => {
        activateColumn();
        const rowRef = toComponentRowRef(row.rowId, row.locator);
        binding.removeRow(rowRef);
        if (areComponentRowRefsEqual(selectedStructureRowRef, rowRef)) {
          requestCloseStructurePanel();
        }
      };

      const handleRowSelect = (row: StructureRowNode) => {
        activateColumn();
        hoverGroupedColumn(null);
        const rowRef = toComponentRowRef(row.rowId, row.locator);
        clearColumnHover();
        setFocusedRow(rowRef);
        setSelectedRow(rowRef);
        requestComponentRowPanel(rowRef, row.label);
      };

      const handleColumnSelect = (column: StructureColumnNode) => {
        activateColumn();
        hoverGroupedColumn(null);
        const columnRef = toComponentColumnRef(column);
        clearRowHover();
        setFocusedColumn(columnRef);
        setSelectedColumn(columnRef);
        requestComponentColumnPanel(columnRef, column.label);
      };

      return {
        binding,
        handleInsert,
        handleMoveRowUp,
        handleMoveRowDown,
        handleRemoveRow,
        handleRowSelect,
        handleColumnSelect,
      };
    },
    [
      clearColumnHover,
      clearRowHover,
      editor,
      hoverGroupedColumn,
      requestCloseStructurePanel,
      requestComponentColumnPanel,
      requestComponentRowPanel,
      selectedStructureRowRef,
      setActiveGroupedColumnIndex,
      setFocusedColumn,
      setFocusedRow,
      setSelectedColumn,
      setSelectedRow,
    ],
  );

  const handleSelectComponent = useCallback(
    (anchor: InsertAnchor, entry: ComponentCatalogEntry) => {
      if (insertColumnIndex == null) {
        return;
      }

      const scope = {
        kind: "groupedColumnCell" as const,
        columnIndex: insertColumnIndex,
      };
      const binding = resolveScopeLayoutBinding(editor, scope);
      const { rowRef, label } = insertCatalogEntryAtAnchor(
        binding,
        anchor,
        entry,
        editor.defaultFieldPath,
        labels.tree,
        fieldDescriptors,
      );

      setActiveGroupedColumnIndex(insertColumnIndex);
      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label);
    },
    [
      clearColumnHover,
      editor,
      fieldDescriptors,
      insertColumnIndex,
      labels.tree,
      requestComponentRowPanel,
      setActiveGroupedColumnIndex,
      setFocusedRow,
      setSelectedRow,
    ],
  );

  const handleImportComponent = useCallback(
    (
      anchor: InsertAnchor,
      row:
        | import("@repo/ui-builder-core").ComponentRowNode
        | import("@repo/ui-builder-core").ComponentRowNode,
    ) => {
      if (insertColumnIndex == null) {
        return;
      }

      const scope = {
        kind: "groupedColumnCell" as const,
        columnIndex: insertColumnIndex,
      };
      const binding = resolveScopeLayoutBinding(editor, scope);
      const { rowRef, label } = insertImportedRowAtAnchor(
        binding,
        anchor,
        row,
        fieldDescriptors,
        labels.tree,
      );

      setActiveGroupedColumnIndex(insertColumnIndex);
      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label);
    },
    [
      clearColumnHover,
      editor,
      fieldDescriptors,
      insertColumnIndex,
      labels.tree,
      requestComponentRowPanel,
      setActiveGroupedColumnIndex,
      setFocusedRow,
      setSelectedRow,
    ],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setInsertAnchor(null);
    setInsertColumnIndex(null);
  }, []);

  const renderColumnHeader = useCallback(
    (
      columnIndex: number,
      columnLabel: string,
      columnId: string,
      expanded: boolean,
    ) => {
      const isGroupedHeaderSelected =
        selectedGroupedColumnIndex === columnIndex && structurePanelOpen;
      const cellNodePanelActive =
        structurePanelOpen &&
        selectedGroupedColumnIndex == null &&
        (selectedStructureRowRef != null || selectedStructureColumnRef != null);
      const isGroupedHeaderFocused =
        !cellNodePanelActive && focusedGroupedColumnIndex === columnIndex;

      return (
        <div
          className="group/node flex min-w-0 items-center rounded-md px-1 py-0.5"
          data-tree-node-id={`grouped-column-${columnId}`}
        >
          <FormDesignerStructureTreeNode
            id={`grouped-column-${columnId}`}
            label={columnLabel}
            kind="grid"
            depth={0}
            expanded={expanded}
            expandable
            expandAriaLabel={labels.expandNode(columnLabel)}
            collapseAriaLabel={labels.collapseNode(columnLabel)}
            onToggle={() => toggleColumnExpanded(columnId)}
            showRowActions
            canMoveUp={columnIndex > 0}
            canMoveDown={columnIndex < editor.expandableColumns.length - 1}
            moveUpLabel={t("designLayout.moveColumnUp")}
            moveDownLabel={t("designLayout.moveColumnDown")}
            deleteLabel={t("designLayout.removeColumn")}
            onMoveUp={() => handleMoveColumnUp(columnIndex)}
            onMoveDown={() => handleMoveColumnDown(columnIndex)}
            onDelete={() => handleRemoveColumn(columnIndex)}
            rowFocusState={
              isGroupedHeaderSelected
                ? "selected"
                : isGroupedHeaderFocused
                  ? "focused"
                  : cellNodePanelActive
                    ? "dimmed"
                    : "none"
            }
            onRowHover={() => {
              clearRowHover();
              clearColumnHover();
              setActiveGroupedColumnIndex(columnIndex);
              hoverGroupedColumn(columnIndex);
            }}
            onRowLeave={() => hoverGroupedColumn(null)}
            onRowSelect={() =>
              handleColumnHeaderSelect(columnIndex, columnLabel)
            }
          />
        </div>
      );
    },
    [
      clearColumnHover,
      clearRowHover,
      editor.expandableColumns.length,
      focusedGroupedColumnIndex,
      handleColumnHeaderSelect,
      handleMoveColumnDown,
      handleMoveColumnUp,
      handleRemoveColumn,
      hoverGroupedColumn,
      labels,
      selectedGroupedColumnIndex,
      selectedStructureColumnRef,
      selectedStructureRowRef,
      setActiveGroupedColumnIndex,
      structurePanelOpen,
      t,
      toggleColumnExpanded,
    ],
  );

  const renderCellLayoutTree = useCallback(
    (columnIndex: number, handlers: ColumnTreeHandlers) => (
      <FormDesignerStructureTree
        layout={handlers.binding.layout}
        labels={labels}
        fieldDescriptors={fieldDescriptors}
        flattenSingleRootColumn
        onInsert={handlers.handleInsert}
        insertDisabled={structurePanelOpen}
        onMoveRowUp={handlers.handleMoveRowUp}
        onMoveRowDown={handlers.handleMoveRowDown}
        onRemoveRow={handlers.handleRemoveRow}
        hoveredRow={focusedRow}
        hoveredColumn={focusedColumn}
        selectedRow={selectedRow}
        selectedColumn={selectedColumn}
        componentRowPanelOpen={structurePanelOpen}
        onRowHover={(row) => {
          setActiveGroupedColumnIndex(columnIndex);
          hoverGroupedColumn(null);
          hoverRow(row);
        }}
        onRowSelect={handlers.handleRowSelect}
        onColumnHover={(column) => {
          setActiveGroupedColumnIndex(columnIndex);
          hoverGroupedColumn(null);
          hoverColumn(column);
        }}
        onColumnSelect={handlers.handleColumnSelect}
      />
    ),
    [
      fieldDescriptors,
      focusedColumn,
      focusedRow,
      hoverColumn,
      hoverGroupedColumn,
      hoverRow,
      labels,
      selectedColumn,
      selectedRow,
      setActiveGroupedColumnIndex,
      structurePanelOpen,
    ],
  );

  const renderGroupedColumnSection = useCallback(
    (
      columnIndex: number,
      options: {
        readonly showInsertAfter?: boolean;
        readonly forceExpanded?: boolean;
      } = {},
    ): ReactNode => {
      const column = editor.expandableColumns[columnIndex];
      if (!column) {
        return null;
      }

      const columnLabel = resolveExpandableTableGroupedColumnDisplayLabel(
        column,
        columnIndex,
        (oneBasedIndex) =>
          t("entity.viewSettings.columnTab", { column: oneBasedIndex }),
      );
      const expanded =
        options.forceExpanded ?? expandedColumnIds.has(column.id);
      const handlers = createColumnTreeHandlers(columnIndex);

      return (
        <div className="flex flex-col">
          {renderColumnHeader(columnIndex, columnLabel, column.id, expanded)}
          {expanded ? (
            <div className="border-border/60 ml-3 border-l pl-2">
              {renderCellLayoutTree(columnIndex, handlers)}
            </div>
          ) : null}
          {options.showInsertAfter ? (
            <FormDesignerStructureTreeInsertSlot
              ariaLabel={t("designLayout.addExpandableTableColumn")}
              anchor={GROUPED_COLUMN_INSERT_ANCHOR}
              disabled={structurePanelOpen}
              onInsert={() => handleInsertColumn(columnIndex + 1)}
            />
          ) : null}
        </div>
      );
    },
    [
      createColumnTreeHandlers,
      editor.expandableColumns,
      expandedColumnIds,
      handleInsertColumn,
      renderCellLayoutTree,
      renderColumnHeader,
      structurePanelOpen,
      t,
    ],
  );

  const expandedContent = (
    <>
      <FormDesignerStructureTreeInsertSlot
        ariaLabel={t("designLayout.addExpandableTableColumn")}
        anchor={GROUPED_COLUMN_INSERT_ANCHOR}
        disabled={structurePanelOpen}
        onInsert={() => handleInsertColumn(0)}
      />

      {editor.expandableColumns.length === 0 ? (
        <Text className="text-muted-foreground px-2 py-3 text-sm">
          {t("designLayout.tableColumnsEmpty")}
        </Text>
      ) : (
        editor.expandableColumns.map((column, columnIndex) => (
          <div key={column.id}>
            {renderGroupedColumnSection(columnIndex, { showInsertAfter: true })}
          </div>
        ))
      )}
    </>
  );

  const collapsedContent = (
    <div
      role="tree"
      aria-label={t("designLayout.expandableTableColumns")}
      className="flex w-full flex-col items-center gap-1 py-1"
    >
      {editor.expandableColumns.length === 0 ? (
        <Text className="text-muted-foreground px-1 py-2 text-center text-[10px] leading-tight">
          {t("designLayout.tableColumnsEmpty")}
        </Text>
      ) : (
        editor.expandableColumns.map((column, columnIndex) => {
          const columnLabel = resolveExpandableTableGroupedColumnDisplayLabel(
            column,
            columnIndex,
            (oneBasedIndex) =>
              t("entity.viewSettings.columnTab", { column: oneBasedIndex }),
          );
          const isFocused = focusedGroupedColumnIndex === columnIndex;
          const isSelected = selectedGroupedColumnIndex === columnIndex;
          const rowFocusState =
            isSelected && structurePanelOpen
              ? "selected"
              : isFocused
                ? "focused"
                : "none";

          return (
            <FormDesignerStructureTreeUtilNode
              key={column.id}
              id={column.id}
              label={columnLabel}
              kind="grid"
              rowFocusState={rowFocusState}
              flyoutOpen={openFlyoutId === column.id}
              onFlyoutOpenChange={(open) =>
                handleFlyoutOpenChange(column.id, open)
              }
              onHover={() => {
                setActiveGroupedColumnIndex(columnIndex);
                hoverGroupedColumn(columnIndex);
              }}
              onLeave={() => hoverGroupedColumn(null)}
              onSelect={() =>
                handleColumnHeaderSelect(columnIndex, columnLabel)
              }
            >
              {renderGroupedColumnSection(columnIndex, { forceExpanded: true })}
            </FormDesignerStructureTreeUtilNode>
          );
        })
      )}
    </div>
  );

  if (embedded) {
    return (
      <>
        {embeddedVariant === "collapsed" ? collapsedContent : expandedContent}
        <FormDesignerAddComponentModal
          open={modalOpen}
          designSurface="tableColumnCell"
          definition={definition}
          defaultFieldPath={editor.defaultFieldPath}
          labels={labels}
          insertAnchor={insertAnchor}
          onClose={handleCloseModal}
          onSelect={handleSelectComponent}
          onImportRow={handleImportComponent}
        />
      </>
    );
  }

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("designLayout.expandableTableColumns")}
        expandLabel={labels.expandPanel}
        collapseLabel={labels.collapsePanel}
        expandedBodyClassName="pt-2"
        collapsedContent={collapsedContent}
      >
        {expandedContent}
      </ItemListDesignerTreePanelShell>

      <FormDesignerAddComponentModal
        open={modalOpen}
        designSurface="tableColumnCell"
        definition={definition}
        defaultFieldPath={editor.defaultFieldPath}
        labels={labels}
        insertAnchor={insertAnchor}
        onClose={handleCloseModal}
        onSelect={handleSelectComponent}
        onImportRow={handleImportComponent}
      />
    </>
  );
}
