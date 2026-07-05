import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { FormDesignerAddComponentModal } from "../form-designer/FormDesignerAddComponentModal";
import type { CatalogEntryKind } from "../form-designer/form-designer-component-catalog";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  insertCatalogEntryAtAnchor,
  insertImportedRowAtAnchor,
} from "../form-designer/form-designer-components-layout";
import type { InsertAnchor } from "../form-designer/form-designer-structure-tree";
import { resolveWidgetsLayoutBinding } from "./metrics-row-designer-layout-binding";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { useMetricsRowDesignerStructureSession } from "./MetricsRowDesignerStructureSession";
import { MetricsRowDesignerStructureTreePanel } from "./MetricsRowDesignerStructureTreePanel";

export function MetricsRowDesignerWidgetsTreePanel() {
  const { t } = useTranslation("common");
  const { editor, requestComponentRowPanel } = useMetricsRowDesigner();
  const definition = useEntityDefinition(editor.entityName);
  const { setFocusedRow, setSelectedRow, clearColumnHover } =
    useMetricsRowDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const binding = useMemo(() => {
    if (!editor.selectedWidget) {
      return null;
    }

    return resolveWidgetsLayoutBinding(editor);
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
      <MetricsRowDesignerStructureTreePanel
        panelTitle={t("metricsRowDesigner.widgets.structureTitle")}
        onInsert={handleInsert}
      />

      <FormDesignerAddComponentModal
        open={modalOpen}
        designSurface="metricWidget"
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
