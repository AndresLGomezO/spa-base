import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, toast } from "@repo/ui";
import type { DesignSurface } from "@repo/ui-builder-core";

import { FormDesignerAddComponentModal } from "./FormDesignerAddComponentModal";
import {
  FormDesignerComponentsSessionProvider,
  useFormDesignerComponentsSession,
} from "./FormDesignerComponentsSession";
import { FormDesignerPreviewPanel } from "./FormDesignerPreviewPanel";
import { FormDesignerStructureTreePanel } from "./FormDesignerStructureTreePanel";
import type { CatalogEntryKind } from "./form-designer-component-catalog";
import { formDesignerComponentsLabels } from "./form-designer-components-labels";
import type { ComponentsTreeScope } from "./form-designer-components-layout";
import type { InsertAnchor } from "./form-designer-structure-tree";
import { useFormDesigner } from "./form-designer-context";

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
  const { editor, canSave, componentsIsDirty, saveComponents } =
    useFormDesigner();
  const { treeScope } = useFormDesignerComponentsSession();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const designSurface = resolveDesignSurface(editor.presentation, treeScope);
  const [insertAnchor, setInsertAnchor] = useState<InsertAnchor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleInsert = useCallback((anchor: InsertAnchor) => {
    setInsertAnchor(anchor);
    setModalOpen(true);
  }, []);

  const handleSelect = useCallback(
    (anchor: InsertAnchor, kind: CatalogEntryKind) => {
      void anchor;
      void kind;
      // Persistence integration will be added in a follow-up iteration.
    },
    [],
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
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-end">
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

      <div className="flex min-h-[28rem] gap-4">
        <FormDesignerStructureTreePanel onInsert={handleInsert} />

        <div className="min-h-0 min-w-0 flex-1">
          <FormDesignerPreviewPanel previewTabId="components" showCard />
        </div>

        <FormDesignerAddComponentModal
          open={modalOpen}
          designSurface={designSurface}
          labels={labels}
          insertAnchor={insertAnchor}
          onClose={handleCloseModal}
          onSelect={handleSelect}
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
