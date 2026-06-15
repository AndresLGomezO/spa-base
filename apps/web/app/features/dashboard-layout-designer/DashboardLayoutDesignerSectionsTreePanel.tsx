import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { FormDesignerAddComponentModal } from "../form-designer/FormDesignerAddComponentModal";
import type { CatalogEntryKind } from "../form-designer/form-designer-component-catalog";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  insertCatalogEntryAtAnchor,
  insertImportedRowAtAnchor,
} from "../form-designer/form-designer-components-layout";
import { TENANT_DASHBOARD_LAYOUT_VALIDATION_DEFINITION } from "./tenant-dashboard-layout-validation-definition";
import type { InsertAnchor } from "../form-designer/form-designer-structure-tree";
import { resolveSectionsLayoutBinding } from "./dashboard-layout-designer-layout-binding";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { useDashboardLayoutDesignerStructureSession } from "./DashboardLayoutDesignerStructureSession";
import { DashboardLayoutDesignerSectionsStructureTreePanel } from "./DashboardLayoutDesignerSectionsStructureTreePanel";

export function DashboardLayoutDesignerSectionsTreePanel() {
  const { t } = useTranslation("common");
  const { editor, requestComponentRowPanel } = useDashboardLayoutDesigner();
  const { setFocusedRow, setSelectedRow, clearColumnHover } =
    useDashboardLayoutDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const binding = useMemo(() => {
    if (!editor.selectedSection) {
      return null;
    }

    return resolveSectionsLayoutBinding(editor);
  }, [editor]);

  const handleInsert = useCallback((anchor: InsertAnchor) => {
    setInsertAnchor(anchor);
    setModalOpen(true);
  }, []);

  const handleSelect = useCallback(
    (anchor: InsertAnchor, kind: CatalogEntryKind) => {
      if (!binding) {
        return;
      }

      const { rowRef, label } = insertCatalogEntryAtAnchor(
        binding,
        anchor,
        kind,
        "name",
        labels.tree,
        [],
        { useStaticDefaults: true },
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

  const handleImportRow = useCallback(
    (
      anchor: InsertAnchor,
      row:
        | import("@repo/ui-builder-core").ComponentRowNode
        | import("@repo/ui-builder-core").NestedLayoutRowNode,
    ) => {
      if (!binding) {
        return;
      }

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
      <DashboardLayoutDesignerSectionsStructureTreePanel
        panelTitle={t("dashboardLayoutDesigner.sections.structureTitle")}
        onInsert={handleInsert}
      />

      <FormDesignerAddComponentModal
        open={modalOpen}
        designSurface="dashboardSection"
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
