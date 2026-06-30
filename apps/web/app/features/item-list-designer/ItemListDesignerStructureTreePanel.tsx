import { useCallback, useEffect, useMemo } from "react";
import { entityCardViewAdapter } from "@repo/ui-builder-react";
import { moveRowAt } from "@repo/ui-builder-core";
import { useTranslation } from "react-i18next";

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import { FormDesignerStructureTree } from "../form-designer/FormDesignerStructureTree";
import { toComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import {
  areComponentRowRefsEqual,
  toComponentRowRef,
} from "../form-designer/form-designer-component-row-ref";
import type {
  InsertAnchor,
  StructureColumnNode,
  StructureRowNode,
} from "../form-designer/form-designer-structure-tree";
import { resolveScopeLayoutBinding } from "./item-list-designer-layout-binding";
import { useItemListDesigner } from "./item-list-designer-context";
import { useItemListDesignerStructureSession } from "./ItemListDesignerStructureSession";
import { ItemListDesignerTreePanelShell } from "./ItemListDesignerTreePanelShell";

interface ItemListDesignerStructureTreePanelProps {
  readonly panelTitle?: string;
  readonly onInsert: (anchor: InsertAnchor) => void;
  readonly embedded?: boolean;
  readonly embeddedVariant?: "expanded" | "collapsed";
}

export function ItemListDesignerStructureTreePanel({
  panelTitle,
  onInsert,
  embedded = false,
  embeddedVariant = "expanded",
}: ItemListDesignerStructureTreePanelProps) {
  const { t } = useTranslation("common");
  const {
    editor,
    structureScope,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestCloseStructurePanel,
    selectedStructureRowRef,
    structurePanelOpen,
  } = useItemListDesigner();
  const {
    focusedRow,
    focusedColumn,
    selectedRow,
    selectedColumn,
    treeRowFocus,
    treeColumnFocus,
    setFocusedRow,
    setFocusedColumn,
    setSelectedRow,
    setSelectedColumn,
    clearColumnHover,
    clearRowHover,
    hoverRow,
    hoverColumn,
  } = useItemListDesignerStructureSession();
  const { getDefinition, items } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);

  const fieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(definition, getDefinition, items).fieldDescriptors,
    [definition, getDefinition, items],
  );

  const binding = useMemo(
    () => resolveScopeLayoutBinding(editor, structureScope),
    [editor, structureScope],
  );

  const handleMoveRowUp = useCallback(
    (row: StructureRowNode) => {
      binding.setLayout(moveRowAt(binding.layout, row.locator, row.rowId, -1));
    },
    [binding],
  );

  const handleMoveRowDown = useCallback(
    (row: StructureRowNode) => {
      binding.setLayout(moveRowAt(binding.layout, row.locator, row.rowId, 1));
    },
    [binding],
  );

  const handleRemoveRow = useCallback(
    (row: StructureRowNode) => {
      const rowRef = toComponentRowRef(row.rowId, row.locator);
      binding.removeRow(rowRef);
      if (areComponentRowRefsEqual(selectedStructureRowRef, rowRef)) {
        requestCloseStructurePanel();
      }
    },
    [binding, requestCloseStructurePanel, selectedStructureRowRef],
  );

  const handleRowSelect = useCallback(
    (row: StructureRowNode) => {
      const rowRef = toComponentRowRef(row.rowId, row.locator);
      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, row.label);
    },
    [clearColumnHover, requestComponentRowPanel, setFocusedRow, setSelectedRow],
  );

  const handleColumnSelect = useCallback(
    (column: StructureColumnNode) => {
      const columnRef = toComponentColumnRef(column);
      clearRowHover();
      setFocusedColumn(columnRef);
      setSelectedColumn(columnRef);
      requestComponentColumnPanel(columnRef, column.label);
    },
    [
      clearRowHover,
      requestComponentColumnPanel,
      setFocusedColumn,
      setSelectedColumn,
    ],
  );

  useEffect(() => {
    if (treeRowFocus) {
      const treeNode = document.querySelector(
        `[data-tree-node-id="row-${treeRowFocus.rowId}"]`,
      );
      treeNode?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }

    if (!treeColumnFocus) {
      return;
    }

    const nestedId =
      treeColumnFocus.nestedParentRowId != null &&
      treeColumnFocus.nestedColumnIndex != null
        ? `col-${treeColumnFocus.nestedParentRowId}-${treeColumnFocus.nestedColumnIndex}`
        : `col-root-${treeColumnFocus.rootColumnIndex}`;
    const treeNode = document.querySelector(
      `[data-tree-node-id="${nestedId}"]`,
    );
    treeNode?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [treeColumnFocus, treeRowFocus]);

  const treeProps = {
    layout: binding.layout,
    labels,
    fieldDescriptors,
    promoteSingleContainerRoot:
      structureScope.kind === "expandableRow" ||
      structureScope.kind === "listItem",
    onInsert,
    insertDisabled: structurePanelOpen,
    onMoveRowUp: handleMoveRowUp,
    onMoveRowDown: handleMoveRowDown,
    onRemoveRow: handleRemoveRow,
    hoveredRow: focusedRow,
    hoveredColumn: focusedColumn,
    selectedRow,
    selectedColumn,
    componentRowPanelOpen: structurePanelOpen,
    onRowHover: hoverRow,
    onRowSelect: handleRowSelect,
    onColumnHover: hoverColumn,
    onColumnSelect: handleColumnSelect,
  };

  if (embedded) {
    if (embeddedVariant === "collapsed") {
      return <FormDesignerStructureTree variant="util" {...treeProps} />;
    }

    return <FormDesignerStructureTree {...treeProps} />;
  }

  if (!panelTitle) {
    return null;
  }

  return (
    <ItemListDesignerTreePanelShell
      title={panelTitle}
      expandLabel={labels.expandPanel}
      collapseLabel={labels.collapsePanel}
      collapsedContent={
        <FormDesignerStructureTree variant="util" {...treeProps} />
      }
    >
      <FormDesignerStructureTree {...treeProps} />
    </ItemListDesignerTreePanelShell>
  );
}
