import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { entityFormFieldAdapter } from "@repo/ui-builder-react";
import type {
  ComponentRowNode,
  CompositionScope,
  DesignSurface,
} from "@repo/ui-builder-core";

import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { FormDesignerAddComponentModal } from "./FormDesignerAddComponentModal";
import {
  FormDesignerComponentsSessionProvider,
  useFormDesignerComponentsSession,
} from "./FormDesignerComponentsSession";
import { FormDesignerPreviewPanel } from "./FormDesignerPreviewPanel";
import { FormDesignerStructureTreePanel } from "./FormDesignerStructureTreePanel";
import type { ComponentCatalogEntry } from "./form-designer-component-catalog";
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
import { UnifiedDesignerLayoutTab } from "../unified-builder/UnifiedDesignerLayoutTab";

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

function resolveCompositionScope(
  presentation: "plain" | "wizard",
  treeScope: ComponentsTreeScope,
): CompositionScope {
  if (presentation === "wizard") {
    return treeScope === "shell" ? "screen" : "section";
  }

  return "section";
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
  const scope = resolveCompositionScope(editor.presentation, treeScope);
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
    (anchor: InsertAnchor, entry: ComponentCatalogEntry) => {
      const { rowRef, label } = insertCatalogEntryAtAnchor(
        binding,
        anchor,
        entry,
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
    (anchor: InsertAnchor, row: ComponentRowNode) => {
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

  return (
    <>
      <UnifiedDesignerLayoutTab
        scope={scope}
        designSurface={designSurface}
        layout={binding.layout}
        setLayout={binding.setLayout}
        canSave={canSave}
        isDirty={componentsIsDirty}
        isSaving={editor.isSaving}
        onSave={saveComponents}
        treePanel={<FormDesignerStructureTreePanel onInsert={handleInsert} />}
        previewPanel={
          <FormDesignerPreviewPanel previewTabId="design" showCard />
        }
        sessionWrapper={(workbench) => workbench}
      />

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
    </>
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
