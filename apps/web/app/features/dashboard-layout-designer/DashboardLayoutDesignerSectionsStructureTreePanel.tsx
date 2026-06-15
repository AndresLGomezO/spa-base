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
import { DashboardLayoutDesignerCollapsedSectionMenu } from "./DashboardLayoutDesignerCollapsedSectionMenu";
import { resolveSectionsLayoutBinding } from "./dashboard-layout-designer-layout-binding";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { useDashboardLayoutDesignerStructureSession } from "./DashboardLayoutDesignerStructureSession";

interface DashboardLayoutDesignerSectionsStructureTreePanelProps {
  readonly panelTitle?: string;
  readonly onInsert: (anchor: InsertAnchor) => void;
}

export function DashboardLayoutDesignerSectionsStructureTreePanel({
  panelTitle,
  onInsert,
}: DashboardLayoutDesignerSectionsStructureTreePanelProps) {
  const { t } = useTranslation("common");
  const {
    editor,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestCloseStructurePanel,
    requestSectionChange,
    selectedStructureRowRef,
    structurePanelOpen,
    structurePanelIsDirty,
    commitStructurePanelSave,
  } = useDashboardLayoutDesigner();
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
  } = useDashboardLayoutDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [sectionModalMode, setSectionModalMode] = useState<
    "add" | "edit" | null
  >(null);
  const [newSectionName, setNewSectionName] = useState("");

  const binding = useMemo(() => {
    if (!editor.selectedSection) {
      return null;
    }

    return resolveSectionsLayoutBinding(editor);
  }, [editor]);

  const hasSections = editor.dashboardSections.length > 0;
  const hasSelectedSection = editor.selectedSection != null;
  const sectionSelectLabel = t("dashboardLayoutDesigner.sections.selectLabel");
  const canRemoveSection = hasSelectedSection;

  const canEditSection = hasSelectedSection;

  const handleOpenAddSection = useCallback(() => {
    setNewSectionName(`Section ${editor.dashboardSections.length + 1}`);
    setSectionModalMode("add");
  }, [editor.dashboardSections.length]);

  const handleOpenEditSection = useCallback(() => {
    if (!editor.selectedSection) {
      return;
    }

    setNewSectionName(editor.selectedSection.name);
    setSectionModalMode("edit");
  }, [editor.selectedSection]);

  const handleCloseSectionModal = useCallback(() => {
    setSectionModalMode(null);
    setNewSectionName("");
  }, []);

  const handleConfirmSectionModal = useCallback(() => {
    const trimmed = newSectionName.trim();
    if (!trimmed) {
      return;
    }

    if (sectionModalMode === "add") {
      editor.addSection(trimmed);
    } else if (sectionModalMode === "edit" && editor.selectedSectionId) {
      editor.renameSection(editor.selectedSectionId, trimmed);
    }

    handleCloseSectionModal();
  }, [editor, handleCloseSectionModal, newSectionName, sectionModalMode]);

  const handleRemoveSection = useCallback(() => {
    if (!canRemoveSection) {
      return;
    }

    if (structurePanelOpen) {
      if (structurePanelIsDirty) {
        commitStructurePanelSave();
      } else {
        requestCloseStructurePanel();
      }
    }

    editor.removeSection(editor.selectedSectionId);
  }, [
    canRemoveSection,
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
      {t("dashboardLayoutDesigner.sections.emptyTree")}
    </Text>
  );

  const sectionScopeSection = (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {sectionSelectLabel}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            id="dashboard-layout-section-select"
            className="border-input bg-background min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm"
            value={hasSelectedSection ? editor.selectedSectionId : ""}
            disabled={!hasSections}
            onChange={(event) => requestSectionChange(event.target.value)}
          >
            {!hasSections ? (
              <option value="">
                {t("dashboardLayoutDesigner.sections.emptyDropdown")}
              </option>
            ) : (
              editor.dashboardSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))
            )}
          </Select>
          <IconButton
            type="button"
            size="sm"
            label={t("dashboardLayoutDesigner.sections.add")}
            onClick={handleOpenAddSection}
          >
            <Plus aria-hidden className="size-4" />
          </IconButton>
          <IconButton
            type="button"
            size="sm"
            label={t("dashboardLayoutDesigner.sections.edit")}
            disabled={!canEditSection}
            onClick={handleOpenEditSection}
          >
            <Pencil aria-hidden className="size-4" />
          </IconButton>
          <IconButton
            type="button"
            size="sm"
            label={t("dashboardLayoutDesigner.sections.remove")}
            disabled={!canRemoveSection}
            onClick={handleRemoveSection}
          >
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        </div>
      </label>
    </div>
  );

  const collapsedSectionHeader = (
    <>
      <DashboardLayoutDesignerCollapsedSectionMenu
        selectedSectionId={editor.selectedSectionId}
        sections={editor.dashboardSections}
        onChange={requestSectionChange}
        ariaLabel={sectionSelectLabel}
        sectionLabel={sectionSelectLabel}
      />
      <IconButton
        type="button"
        size="sm"
        label={t("dashboardLayoutDesigner.sections.add")}
        onClick={handleOpenAddSection}
      >
        <Plus aria-hidden className="size-4" />
      </IconButton>
      <IconButton
        type="button"
        size="sm"
        label={t("dashboardLayoutDesigner.sections.edit")}
        disabled={!canEditSection}
        onClick={handleOpenEditSection}
      >
        <Pencil aria-hidden className="size-4" />
      </IconButton>
      <IconButton
        type="button"
        size="sm"
        label={t("dashboardLayoutDesigner.sections.remove")}
        disabled={!canRemoveSection}
        onClick={handleRemoveSection}
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
        scopeSection={sectionScopeSection}
        collapsedHeaderContent={collapsedSectionHeader}
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
        open={sectionModalMode != null}
        onClose={handleCloseSectionModal}
        title={
          sectionModalMode === "add"
            ? t("dashboardLayoutDesigner.sections.addModalTitle")
            : t("dashboardLayoutDesigner.sections.editModalTitle")
        }
      >
        <div className="flex flex-col gap-3">
          <FieldLabel htmlFor="dashboard-layout-new-section-name">
            {t("dashboardLayoutDesigner.sections.nameLabel")}
          </FieldLabel>
          <Input
            id="dashboard-layout-new-section-name"
            value={newSectionName}
            onChange={(event) => setNewSectionName(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseSectionModal}
            >
              {t("designLayout.sliceJson.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!newSectionName.trim()}
              onClick={handleConfirmSectionModal}
            >
              {sectionModalMode === "add"
                ? t("dashboardLayoutDesigner.sections.add")
                : t("dashboardLayoutDesigner.sections.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
