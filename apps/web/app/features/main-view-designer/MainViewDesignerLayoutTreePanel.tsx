import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { FormDesignerAddComponentModal } from "../form-designer/FormDesignerAddComponentModal";
import type { ComponentCatalogEntry } from "../form-designer/form-designer-component-catalog";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  insertCatalogEntryAtAnchor,
  insertImportedRowAtAnchor,
} from "../form-designer/form-designer-components-layout";
import type { InsertAnchor } from "../form-designer/form-designer-structure-tree";
import { resolveLayoutBinding } from "./main-view-designer-layout-binding";
import { useMainViewDesigner } from "./main-view-designer-context";
import { useMainViewDesignerStructureSession } from "./MainViewDesignerStructureSession";
import { MainViewDesignerStructureTreePanel } from "./MainViewDesignerStructureTreePanel";

export function MainViewDesignerLayoutTreePanel() {
  const { t } = useTranslation("common");
  const { editor, requestComponentRowPanel } = useMainViewDesigner();
  const definition = useEntityDefinition(editor.entityName);
  const { setFocusedRow, setSelectedRow, clearColumnHover } =
    useMainViewDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const binding = useMemo(() => resolveLayoutBinding(editor), [editor]);

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
      <MainViewDesignerStructureTreePanel
        panelTitle={t("designLayout.mainPageStructure")}
        onInsert={handleInsert}
      />
      <FormDesignerAddComponentModal
        open={modalOpen}
        designSurface="mainPage"
        definition={definition}
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
