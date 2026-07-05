import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { FormDesignerAddComponentModal } from "../form-designer/FormDesignerAddComponentModal";
import type { CatalogEntryKind } from "../form-designer/form-designer-component-catalog";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  findRowByRef,
  insertCatalogEntryAtAnchor,
  insertImportedRowAtAnchor,
} from "../form-designer/form-designer-components-layout";
import { TENANT_DASHBOARD_LAYOUT_VALIDATION_DEFINITION } from "./tenant-dashboard-layout-validation-definition";
import type { InsertAnchor } from "../form-designer/form-designer-structure-tree";
import { resolveDashboardLayoutBinding } from "./dashboard-layout-designer-layout-binding";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { useDashboardLayoutDesignerStructureSession } from "./DashboardLayoutDesignerStructureSession";
import { DashboardLayoutDesignerLayoutStructureTreePanel } from "./DashboardLayoutDesignerLayoutStructureTreePanel";

export function DashboardLayoutDesignerLayoutTreePanel() {
  const { t } = useTranslation("common");
  const { editor, requestComponentRowPanel } = useDashboardLayoutDesigner();
  const { setFocusedRow, setSelectedRow, clearColumnHover } =
    useDashboardLayoutDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const binding = useMemo(
    () => resolveDashboardLayoutBinding(editor),
    [editor],
  );

  const handleInsert = useCallback((anchor: InsertAnchor) => {
    setInsertAnchor(anchor);
    setModalOpen(true);
  }, []);

  const handleSelect = useCallback(
    (anchor: InsertAnchor, kind: CatalogEntryKind) => {
      const { rowRef, label } = insertCatalogEntryAtAnchor(
        binding,
        anchor,
        kind,
        "name",
        labels.tree,
        [],
        { useStaticDefaults: true },
      );

      if (kind === "dashboard-section") {
        const row = findRowByRef(binding.layout, rowRef);
        if (
          row?.type === "component" &&
          row.component.kind === "dashboard-section"
        ) {
          binding.updateComponent(rowRef, {
            ...row.component,
            sectionId: editor.dashboardSections[0]?.id ?? "",
          });
        }
      }

      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label);
    },
    [
      binding,
      clearColumnHover,
      editor.dashboardSections,
      labels.tree,
      requestComponentRowPanel,
      setFocusedRow,
      setSelectedRow,
    ],
  );

  const handleImportRow = useCallback(
    (
      anchor: InsertAnchor,
      row:
        | import("@repo/ui-builder-core").ComponentRowNode
        | import("@repo/ui-builder-core").ComponentRowNode,
    ) => {
      const { rowRef, label } = insertImportedRowAtAnchor(
        binding,
        anchor,
        row,
        [],
        labels.tree,
      );

      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label);
    },
    [
      binding,
      clearColumnHover,
      labels.tree,
      requestComponentRowPanel,
      setFocusedRow,
      setSelectedRow,
    ],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setInsertAnchor(null);
  }, []);

  return (
    <>
      <DashboardLayoutDesignerLayoutStructureTreePanel
        panelTitle={t("dashboardLayoutDesigner.layout.structureTitle")}
        onInsert={handleInsert}
      />

      <FormDesignerAddComponentModal
        open={modalOpen}
        designSurface="dashboardLayout"
        definition={TENANT_DASHBOARD_LAYOUT_VALIDATION_DEFINITION}
        defaultFieldPath="name"
        labels={labels}
        insertAnchor={insertAnchor}
        onClose={handleCloseModal}
        onSelect={handleSelect}
        onImportRow={handleImportRow}
      />
    </>
  );
}
