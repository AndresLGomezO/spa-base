import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { entityCardViewAdapter } from "@repo/ui-builder-react";

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { FormDesignerAddComponentModal } from "../form-designer/FormDesignerAddComponentModal";
import type { CatalogEntryKind } from "../form-designer/form-designer-component-catalog";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  findRowByRef,
  insertCatalogEntryAtAnchor,
} from "../form-designer/form-designer-components-layout";
import type { InsertAnchor } from "../form-designer/form-designer-structure-tree";
import { resolveRowLayoutBinding } from "./metrics-row-designer-layout-binding";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { useMetricsRowDesignerStructureSession } from "./MetricsRowDesignerStructureSession";
import { MetricsRowDesignerRowStructureTreePanel } from "./MetricsRowDesignerRowStructureTreePanel";

export function MetricsRowDesignerRowTreePanel() {
  const { t } = useTranslation("common");
  const { editor, requestComponentRowPanel } = useMetricsRowDesigner();
  const { getDefinition } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const { setFocusedRow, setSelectedRow, clearColumnHover } =
    useMetricsRowDesignerStructureSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fieldDescriptors = useMemo(
    () => entityCardViewAdapter(definition, getDefinition).fieldDescriptors,
    [definition, getDefinition],
  );

  const binding = useMemo(() => resolveRowLayoutBinding(editor), [editor]);

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
        fieldDescriptors,
      );

      if (kind === "metric-widget") {
        const row = findRowByRef(binding.layout, rowRef);
        if (
          row?.type === "component" &&
          row.component.kind === "metric-widget"
        ) {
          binding.updateComponent(rowRef, {
            ...row.component,
            entityName: editor.entityName,
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
      editor.entityName,
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
      <MetricsRowDesignerRowStructureTreePanel
        panelTitle={t("metricsRowDesigner.row.structureTitle")}
        onInsert={handleInsert}
      />

      <FormDesignerAddComponentModal
        open={modalOpen}
        designSurface="metricRow"
        labels={labels}
        insertAnchor={insertAnchor}
        onClose={handleCloseModal}
        onSelect={handleSelect}
      />
    </>
  );
}
