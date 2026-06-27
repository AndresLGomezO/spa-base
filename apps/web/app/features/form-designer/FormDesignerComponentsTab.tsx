import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, toast } from "@repo/ui";
import { entityFormFieldAdapter } from "@repo/ui-builder-react";
import type {
  DesignSurface,
  ComponentRowNode,
  NestedLayoutRowNode,
} from "@repo/ui-builder-core";

import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { FormDesignerAddComponentModal } from "./FormDesignerAddComponentModal";
import {
  FormDesignerComponentsSessionProvider,
  useFormDesignerComponentsSession,
} from "./FormDesignerComponentsSession";
import { FormDesignerPreviewPanel } from "./FormDesignerPreviewPanel";
import { FormDesignerStructureTreePanel } from "./FormDesignerStructureTreePanel";
import type { CatalogEntryKind } from "./form-designer-component-catalog";
import { formDesignerComponentsLabels } from "./form-designer-components-labels";
import {
  clampComponentsStepIndex,
  insertCatalogEntryAtAnchor,
  insertImportedRowAtAnchor,
  resolveComponentsLayoutBinding,
  type ComponentsTreeScope,
} from "./form-designer-components-layout";
import type { InsertAnchor } from "./form-designer-structure-tree";
import { useFormDesigner } from "./form-designer-context";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";

function resolveDesignSurface(
  presentation: "plain" | "wizard",
  treeScope: ComponentsTreeScope,
): DesignSurface {
  if (treeScope === "footer") {
    return "formModalFooter";
  }

  if (presentation === "wizard") {
    return treeScope === "shell" ? "formWizardShell" : "formWizardStep";
  }

  return "formPlain";
}

function FormDesignerComponentsTabContent() {
  const { t } = useTranslation("common");
  const {
    editor,
    canSave,
    componentsIsDirty,
    saveComponents,
    markComponentsDirty,
    requestComponentRowPanel,
  } = useFormDesigner();
  const {
    treeScope,
    stepIndex,
    setFocusedRow,
    setSelectedRow,
    clearColumnHover,
  } = useFormDesignerComponentsSession();
  const definition = useEntityDefinition(editor.definition.name);
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const designSurface = resolveDesignSurface(editor.presentation, treeScope);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fieldDescriptors = useMemo(
    () => entityFormFieldAdapter(definition).fieldDescriptors,
    [definition],
  );

  const clampedStepIndex = clampComponentsStepIndex(
    stepIndex,
    editor.wizard.steps.length,
  );

  const binding = useMemo(
    () => resolveComponentsLayoutBinding(editor, treeScope, clampedStepIndex),
    [clampedStepIndex, editor, treeScope],
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

      markComponentsDirty();
      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label, {
        treeScope,
        stepIndex: clampedStepIndex,
      });
    },
    [
      binding,
      clampedStepIndex,
      clearColumnHover,
      editor.defaultFieldPath,
      fieldDescriptors,
      labels.tree,
      markComponentsDirty,
      requestComponentRowPanel,
      setFocusedRow,
      setSelectedRow,
      treeScope,
    ],
  );

  const handleImportRow = useCallback(
    (anchor: InsertAnchor, row: ComponentRowNode | NestedLayoutRowNode) => {
      const { rowRef, label } = insertImportedRowAtAnchor(
        binding,
        anchor,
        row,
        fieldDescriptors,
        labels.tree,
      );

      markComponentsDirty();
      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label, {
        treeScope,
        stepIndex: clampedStepIndex,
      });
    },
    [
      binding,
      clampedStepIndex,
      clearColumnHover,
      fieldDescriptors,
      labels.tree,
      markComponentsDirty,
      requestComponentRowPanel,
      setFocusedRow,
      setSelectedRow,
      treeScope,
    ],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setInsertAnchor(null);
  }, []);

  const handleSave = async () => {
    if (!canSave || !componentsIsDirty) {
      return;
    }

    const error = await saveComponents();
    if (!error) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(error);
    }
  };

  return (
    <div className={designerTreeTabRootClassName}>
      <div className="flex shrink-0 items-start justify-end">
        <Button
          type="button"
          className="shrink-0"
          loading={editor.isSaving}
          disabled={!canSave || !componentsIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <div className={designerTreeWorkbenchClassName}>
        <FormDesignerStructureTreePanel onInsert={handleInsert} />

        <div className={designerPreviewColumnClassName}>
          <FormDesignerPreviewPanel previewTabId="components" showCard />
        </div>

        <FormDesignerAddComponentModal
          open={modalOpen}
          designSurface={designSurface}
          definition={definition}
          defaultFieldPath={editor.defaultFieldPath}
          labels={labels}
          insertAnchor={insertAnchor}
          actionsInModalFooter={treeScope === "footer"}
          onClose={handleCloseModal}
          onSelect={handleSelect}
          onImportRow={handleImportRow}
        />
      </div>
    </div>
  );
}

export function FormDesignerComponentsTab() {
  const { editor } = useFormDesigner();

  return (
    <FormDesignerComponentsSessionProvider presentation={editor.presentation}>
      <FormDesignerComponentsTabContent />
    </FormDesignerComponentsSessionProvider>
  );
}
