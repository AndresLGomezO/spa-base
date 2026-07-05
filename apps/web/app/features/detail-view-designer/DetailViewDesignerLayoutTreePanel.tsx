import { useCallback, useMemo, useState } from "react";
import { entityCardViewAdapter } from "@repo/ui-builder-react";
import { useTranslation } from "react-i18next";

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { FormDesignerAddComponentModal } from "../form-designer/FormDesignerAddComponentModal";
import type { CatalogEntryKind } from "../form-designer/form-designer-component-catalog";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  insertCatalogEntryAtAnchor,
  insertImportedRowAtAnchor,
} from "../form-designer/form-designer-components-layout";
import type { InsertAnchor } from "../form-designer/form-designer-structure-tree";
import { resolveLayoutBinding } from "./detail-view-designer-layout-binding";
import { useDetailViewDesigner } from "./detail-view-designer-context";
import { useDetailViewDesignerStructureSession } from "./DetailViewDesignerStructureSession";
import { DetailViewDesignerStructureTreePanel } from "./DetailViewDesignerStructureTreePanel";

export function DetailViewDesignerLayoutTreePanel() {
  const { t } = useTranslation("common");
  const { editor, requestComponentRowPanel } = useDetailViewDesigner();
  const { getDefinition, items } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const { setFocusedRow, setSelectedRow, clearColumnHover } =
    useDetailViewDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(definition, getDefinition, items).fieldDescriptors,
    [definition, getDefinition, items],
  );

  const binding = useMemo(() => resolveLayoutBinding(editor), [editor]);

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
        editor.defaultFieldPath,
        labels.tree,
        fieldDescriptors,
      );

      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label);
    },
    [
      binding,
      clearColumnHover,
      editor.defaultFieldPath,
      fieldDescriptors,
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
        fieldDescriptors,
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
      fieldDescriptors,
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
      <DetailViewDesignerStructureTreePanel
        panelTitle={t("designLayout.recordDetailStructure")}
        onInsert={handleInsert}
      />
      <FormDesignerAddComponentModal
        open={modalOpen}
        designSurface="recordDetail"
        definition={definition}
        defaultFieldPath={editor.defaultFieldPath}
        labels={labels}
        insertAnchor={insertAnchor}
        onClose={handleCloseModal}
        onSelect={handleSelect}
        onImportRow={handleImportRow}
      />
    </>
  );
}
