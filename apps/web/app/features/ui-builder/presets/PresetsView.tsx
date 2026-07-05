import { BuilderPageShell, Button, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../designer-tree-workbench-classes";
import { PresetCreateModal } from "./PresetCreateModal";
import { PresetDetailPanel } from "./PresetDetailPanel";
import { PresetListTreePanel } from "./PresetListTreePanel";
import { PresetsProvider, usePresets } from "./presets-context";

function PresetsWorkbench() {
  const { t } = useTranslation("common");
  const { editor, canDelete, deleteTargetId, closeDeleteConfirm } =
    usePresets();

  const deleteTarget = deleteTargetId
    ? editor.entries.find((entry) => entry.id === deleteTargetId)
    : null;

  async function handleConfirmDelete() {
    if (!deleteTargetId) {
      return;
    }
    const error = await editor.deletePreset(deleteTargetId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("designLayout.presets.deleted"));
    closeDeleteConfirm();
  }

  if (editor.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">{t("loading")}</Text>
    );
  }

  if (editor.loadError) {
    return <Text className="text-destructive text-sm">{editor.loadError}</Text>;
  }

  return (
    <>
      <div className={designerTreeTabRootClassName}>
        <div className={designerTreeWorkbenchClassName}>
          <PresetListTreePanel />
          <div className={designerPreviewColumnClassName}>
            <PresetDetailPanel />
          </div>
        </div>
      </div>

      <PresetCreateModal />

      <Modal
        open={deleteTargetId !== null}
        onClose={closeDeleteConfirm}
        title={t("designLayout.presets.deleteTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
            >
              {t("designLayout.presets.cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canDelete}
              onClick={() => void handleConfirmDelete()}
            >
              {t("designLayout.presets.delete")}
            </Button>
          </div>
        }
      >
        <Text>
          {t("designLayout.presets.deleteMessage", {
            name: deleteTarget?.name ?? "",
          })}
        </Text>
      </Modal>
    </>
  );
}

interface PresetsViewProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function PresetsView({
  canCreate,
  canUpdate,
  canDelete,
}: PresetsViewProps) {
  const { t } = useTranslation("common");

  return (
    <PresetsProvider
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <BuilderPageShell
          title={t("designLayout.presets.title")}
          subtitle={t("designLayout.presets.description")}
          bodyScrollable={false}
        >
          <PresetsWorkbench />
        </BuilderPageShell>
      </div>
    </PresetsProvider>
  );
}
