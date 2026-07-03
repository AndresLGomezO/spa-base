import { BuilderPageShell, Button, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { FormulaListTreePanel } from "./FormulaListTreePanel";
import { FormulaMetadataModal } from "./FormulaMetadataModal";
import { FormulaSettingsPanel } from "./FormulaSettingsPanel";
import { FormulasProvider, useFormulas } from "./formulas-context";

function FormulasWorkbench() {
  const { t } = useTranslation("common");
  const {
    editor,
    metadataEditId,
    deleteTargetId,
    closeMetadataEdit,
    closeDeleteConfirm,
    canDelete,
  } = useFormulas();

  const deleteTarget = deleteTargetId
    ? editor.definitions.find((entry) => entry.id === deleteTargetId)
    : null;

  async function handleConfirmDelete() {
    if (!deleteTargetId) {
      return;
    }
    const error = await editor.deleteFormula(deleteTargetId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("formulas.deleted"));
    closeDeleteConfirm();
  }

  if (editor.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("formulas.loading")}
      </Text>
    );
  }

  if (editor.loadError) {
    return <Text className="text-destructive text-sm">{editor.loadError}</Text>;
  }

  return (
    <>
      <div className={designerTreeTabRootClassName}>
        <div className={designerTreeWorkbenchClassName}>
          <FormulaListTreePanel />
          <div className={designerPreviewColumnClassName}>
            <FormulaSettingsPanel />
          </div>
        </div>
      </div>

      <FormulaMetadataModal
        mode="edit"
        open={metadataEditId !== null}
        formulaId={metadataEditId ?? undefined}
        onClose={closeMetadataEdit}
      />

      <Modal
        open={deleteTargetId !== null}
        onClose={closeDeleteConfirm}
        title={t("formulas.delete.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
            >
              {t("formulas.cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canDelete}
              onClick={() => void handleConfirmDelete()}
            >
              {t("formulas.delete.confirm")}
            </Button>
          </div>
        }
      >
        <Text>
          {t("formulas.delete.message", { name: deleteTarget?.name ?? "" })}
        </Text>
      </Modal>
    </>
  );
}

interface FormulasViewProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function FormulasView({
  canCreate,
  canUpdate,
  canDelete,
}: FormulasViewProps) {
  const { t } = useTranslation("common");

  return (
    <FormulasProvider
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <BuilderPageShell
          title={t("formulas.title")}
          subtitle={t("formulas.description")}
          bodyScrollable={false}
        >
          <FormulasWorkbench />
        </BuilderPageShell>
      </div>
    </FormulasProvider>
  );
}
