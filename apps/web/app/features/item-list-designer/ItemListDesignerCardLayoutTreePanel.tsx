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
import { resolveScopeLayoutBinding } from "./item-list-designer-layout-binding";
import { useItemListDesigner } from "./item-list-designer-context";
import { useItemListDesignerStructureSession } from "./ItemListDesignerStructureSession";
import { ItemListDesignerStructureTreePanel } from "./ItemListDesignerStructureTreePanel";

interface ItemListDesignerCardLayoutTreePanelProps {
  readonly embedded?: boolean;
  readonly embeddedVariant?: "expanded" | "collapsed";
}

export function ItemListDesignerCardLayoutTreePanel({
  embedded = false,
  embeddedVariant = "expanded",
}: ItemListDesignerCardLayoutTreePanelProps = {}) {
  const { t } = useTranslation("common");
  const { editor, requestComponentRowPanel } = useItemListDesigner();
  const { setFocusedRow, setSelectedRow, clearColumnHover } =
    useItemListDesignerStructureSession();
  const { getDefinition } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fieldDescriptors = useMemo(
    () => entityCardViewAdapter(definition, getDefinition).fieldDescriptors,
    [definition, getDefinition],
  );

  const binding = useMemo(
    () => resolveScopeLayoutBinding(editor, { kind: "listItem" }),
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
        | import("@repo/ui-builder-core").NestedLayoutRowNode,
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

  const treePanel = (
    <ItemListDesignerStructureTreePanel
      panelTitle={embedded ? undefined : t("designLayout.listItemStructure")}
      onInsert={handleInsert}
      embedded={embedded}
      embeddedVariant={embeddedVariant}
    />
  );

  if (embedded) {
    return (
      <>
        {treePanel}
        <FormDesignerAddComponentModal
          open={modalOpen}
          designSurface="listItem"
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

  return (
    <>
      {treePanel}
      <FormDesignerAddComponentModal
        open={modalOpen}
        designSurface="listItem"
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
