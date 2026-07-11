import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DesignSurface } from "@repo/ui-builder-core";

import { FormDesignerAddComponentModal } from "../form-designer/FormDesignerAddComponentModal";
import type { ComponentCatalogEntry } from "../form-designer/form-designer-component-catalog";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  insertCatalogEntryAtAnchor,
  insertImportedRowAtAnchor,
} from "../form-designer/form-designer-components-layout";
import type { InsertAnchor } from "../form-designer/form-designer-structure-tree";
import { resolveActiveLayoutBinding } from "./sidebar-layout-designer-layout-binding";
import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { useSidebarLayoutDesignerStructureSession } from "./SidebarLayoutDesignerStructureSession";
import { SidebarLayoutDesignerLayoutStructureTreePanel } from "./SidebarLayoutDesignerLayoutStructureTreePanel";
import { TENANT_SIDEBAR_LAYOUT_VALIDATION_DEFINITION } from "./tenant-sidebar-layout-validation-definition";

interface SidebarLayoutDesignerLayoutTreePanelProps {
  readonly designSurface: DesignSurface;
}

export function SidebarLayoutDesignerLayoutTreePanel({
  designSurface,
}: SidebarLayoutDesignerLayoutTreePanelProps) {
  const { t } = useTranslation("common");
  const { editor, designFocus, requestComponentRowPanel } =
    useSidebarLayoutDesigner();
  const { setFocusedRow, setSelectedRow, clearColumnHover } =
    useSidebarLayoutDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, designFocus),
    [designFocus, editor],
  );

  const panelTitle =
    designSurface === "headerLayout"
      ? t("sidebarLayoutDesigner.layout.headerStructureTitle")
      : designSurface === "footerLayout"
        ? t("sidebarLayoutDesigner.layout.footerStructureTitle")
        : t("sidebarLayoutDesigner.layout.structureTitle");

  const handleInsert = useCallback((anchor: InsertAnchor) => {
    setInsertAnchor(anchor);
    setModalOpen(true);
  }, []);

  const handleSelect = useCallback(
    (anchor: InsertAnchor, entry: ComponentCatalogEntry) => {
      const { rowRef, label } = insertCatalogEntryAtAnchor(
        binding,
        anchor,
        entry,
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
      <SidebarLayoutDesignerLayoutStructureTreePanel
        panelTitle={panelTitle}
        onInsert={handleInsert}
      />

      <FormDesignerAddComponentModal
        open={modalOpen}
        designSurface={designSurface}
        definition={TENANT_SIDEBAR_LAYOUT_VALIDATION_DEFINITION}
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
