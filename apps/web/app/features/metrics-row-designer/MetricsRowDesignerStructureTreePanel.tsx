import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  FieldLabel,
  IconButton,
  Input,
  Modal,
  Text,
  Select,
} from "@repo/ui";
import { isRootContainerRow, moveRowAt } from "@repo/ui-builder-core";
import { useTranslation } from "react-i18next";

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
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { MetricsRowDesignerCollapsedWidgetMenu } from "./MetricsRowDesignerCollapsedWidgetMenu";
import { resolveWidgetsLayoutBinding } from "./metrics-row-designer-layout-binding";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { useMetricsRowDesignerStructureSession } from "./MetricsRowDesignerStructureSession";

interface MetricsRowDesignerStructureTreePanelProps {
  readonly panelTitle?: string;
  readonly onInsert: (anchor: InsertAnchor) => void;
}

export function MetricsRowDesignerStructureTreePanel({
  panelTitle,
  onInsert,
}: MetricsRowDesignerStructureTreePanelProps) {
  const { t } = useTranslation("common");
  const {
    editor,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestCloseStructurePanel,
    requestWidgetChange,
    selectedStructureRowRef,
    structurePanelOpen,
    structurePanelIsDirty,
    commitStructurePanelSave,
  } = useMetricsRowDesigner();
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
  } = useMetricsRowDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [widgetModalMode, setWidgetModalMode] = useState<"add" | "edit" | null>(
    null,
  );
  const [newWidgetName, setNewWidgetName] = useState("");

  const binding = useMemo(() => {
    if (!editor.selectedWidget) {
      return null;
    }

    return resolveWidgetsLayoutBinding(editor);
  }, [editor]);

  const hasWidgets = editor.widgets.length > 0;
  const hasSelectedWidget = editor.selectedWidget != null;
  const widgetSelectLabel = t("metricsRowDesigner.widgets.selectLabel");
  const canRemoveWidget = hasSelectedWidget;

  const canEditWidget = hasSelectedWidget;

  const handleOpenAddWidget = useCallback(() => {
    setNewWidgetName(`Widget ${editor.widgets.length + 1}`);
    setWidgetModalMode("add");
  }, [editor.widgets.length]);

  const handleOpenEditWidget = useCallback(() => {
    if (!editor.selectedWidget) {
      return;
    }

    setNewWidgetName(editor.selectedWidget.name);
    setWidgetModalMode("edit");
  }, [editor.selectedWidget]);

  const handleCloseWidgetModal = useCallback(() => {
    setWidgetModalMode(null);
    setNewWidgetName("");
  }, []);

  const handleConfirmWidgetModal = useCallback(() => {
    const trimmed = newWidgetName.trim();
    if (!trimmed) {
      return;
    }

    if (widgetModalMode === "add") {
      editor.addWidget(trimmed);
    } else if (widgetModalMode === "edit" && editor.selectedWidgetId) {
      editor.renameWidget(editor.selectedWidgetId, trimmed);
    }

    handleCloseWidgetModal();
  }, [editor, handleCloseWidgetModal, newWidgetName, widgetModalMode]);

  const handleRemoveWidget = useCallback(() => {
    if (!canRemoveWidget) {
      return;
    }

    if (structurePanelOpen) {
      if (structurePanelIsDirty) {
        commitStructurePanelSave();
      } else {
        requestCloseStructurePanel();
      }
    }

    editor.removeWidget(editor.selectedWidgetId);
  }, [
    canRemoveWidget,
    commitStructurePanelSave,
    editor,
    requestCloseStructurePanel,
    structurePanelIsDirty,
    structurePanelOpen,
  ]);

  const handleMoveRowUp = useCallback(
    (row: StructureRowNode) => {
      if (!binding) {
        return;
      }

      binding.setLayout(moveRowAt(binding.layout, row.locator, row.rowId, -1));
    },
    [binding],
  );

  const handleMoveRowDown = useCallback(
    (row: StructureRowNode) => {
      if (!binding) {
        return;
      }

      binding.setLayout(moveRowAt(binding.layout, row.locator, row.rowId, 1));
    },
    [binding],
  );

  const handleRemoveRow = useCallback(
    (row: StructureRowNode) => {
      if (!binding) {
        return;
      }

      if (isRootContainerRow(binding.layout, row.rowId)) {
        return;
      }

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

  const treeProps = binding
    ? {
        layout: binding.layout,
        labels,
        fieldDescriptors: [] as const,
        promoteSingleContainerRoot: true,
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
      }
    : null;

  const emptyTreeMessage = (
    <Text className="text-muted-foreground px-2 py-4 text-sm">
      {t("metricsRowDesigner.widgets.emptyTree")}
    </Text>
  );

  const widgetScopeSection = (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {widgetSelectLabel}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            id="metrics-row-widget-select"
            className="border-input bg-background min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm"
            value={hasSelectedWidget ? editor.selectedWidgetId : ""}
            disabled={!hasWidgets}
            onChange={(event) => requestWidgetChange(event.target.value)}
          >
            {!hasWidgets ? (
              <option value="">
                {t("metricsRowDesigner.widgets.emptyDropdown")}
              </option>
            ) : (
              editor.widgets.map((widget) => (
                <option key={widget.id} value={widget.id}>
                  {widget.name}
                </option>
              ))
            )}
          </Select>
          <IconButton
            type="button"
            size="sm"
            label={t("metricsRowDesigner.widgets.add")}
            onClick={handleOpenAddWidget}
          >
            <Plus aria-hidden className="size-4" />
          </IconButton>
          <IconButton
            type="button"
            size="sm"
            label={t("metricsRowDesigner.widgets.edit")}
            disabled={!canEditWidget}
            onClick={handleOpenEditWidget}
          >
            <Pencil aria-hidden className="size-4" />
          </IconButton>
          <IconButton
            type="button"
            size="sm"
            label={t("metricsRowDesigner.widgets.remove")}
            disabled={!canRemoveWidget}
            onClick={handleRemoveWidget}
          >
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        </div>
      </label>
    </div>
  );

  const collapsedWidgetHeader = (
    <>
      <MetricsRowDesignerCollapsedWidgetMenu
        selectedWidgetId={editor.selectedWidgetId}
        widgets={editor.widgets}
        onChange={requestWidgetChange}
        ariaLabel={widgetSelectLabel}
        widgetLabel={widgetSelectLabel}
      />
      <IconButton
        type="button"
        size="sm"
        label={t("metricsRowDesigner.widgets.add")}
        onClick={handleOpenAddWidget}
      >
        <Plus aria-hidden className="size-4" />
      </IconButton>
      <IconButton
        type="button"
        size="sm"
        label={t("metricsRowDesigner.widgets.edit")}
        disabled={!canEditWidget}
        onClick={handleOpenEditWidget}
      >
        <Pencil aria-hidden className="size-4" />
      </IconButton>
      <IconButton
        type="button"
        size="sm"
        label={t("metricsRowDesigner.widgets.remove")}
        disabled={!canRemoveWidget}
        onClick={handleRemoveWidget}
      >
        <Trash2 aria-hidden className="size-4" />
      </IconButton>
    </>
  );

  if (!panelTitle) {
    return null;
  }

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={panelTitle}
        expandLabel={labels.expandPanel}
        collapseLabel={labels.collapsePanel}
        scopeSection={widgetScopeSection}
        collapsedHeaderContent={collapsedWidgetHeader}
        collapsedContent={
          treeProps ? (
            <FormDesignerStructureTree variant="util" {...treeProps} />
          ) : (
            emptyTreeMessage
          )
        }
      >
        {treeProps ? (
          <FormDesignerStructureTree {...treeProps} />
        ) : (
          emptyTreeMessage
        )}
      </ItemListDesignerTreePanelShell>

      <Modal
        open={widgetModalMode != null}
        onClose={handleCloseWidgetModal}
        title={
          widgetModalMode === "add"
            ? t("metricsRowDesigner.widgets.addModalTitle")
            : t("metricsRowDesigner.widgets.editModalTitle")
        }
      >
        <div className="flex flex-col gap-3">
          <FieldLabel htmlFor="metrics-row-new-widget-name">
            {t("metricsRowDesigner.widgets.nameLabel")}
          </FieldLabel>
          <Input
            id="metrics-row-new-widget-name"
            value={newWidgetName}
            onChange={(event) => setNewWidgetName(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseWidgetModal}
            >
              {t("designLayout.sliceJson.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!newWidgetName.trim()}
              onClick={handleConfirmWidgetModal}
            >
              {widgetModalMode === "add"
                ? t("metricsRowDesigner.widgets.add")
                : t("metricsRowDesigner.widgets.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
