import { BuilderPageShell, Button, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { CustomViewListTreePanel } from "./CustomViewListTreePanel";
import { CustomViewSettingsPanel } from "./CustomViewSettingsPanel";
import { CustomViewsProvider, useCustomViews } from "./custom-views-context";

function CustomViewsWorkbench() {
  const { t } = useTranslation("common");
  const { editor, deleteTargetId, closeDeleteConfirm, canDelete } =
    useCustomViews();

  const deleteTarget = deleteTargetId
    ? editor.views.find((entry) => entry.id === deleteTargetId)
    : null;

  async function handleConfirmDelete() {
    if (!deleteTargetId) {
      return;
    }
    const error = await editor.deleteView(deleteTargetId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("customViews.deleteSuccess"));
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
          <CustomViewListTreePanel />
          <div className={designerPreviewColumnClassName}>
            <CustomViewSettingsPanel />
          </div>
        </div>
      </div>

      <Modal
        open={deleteTargetId !== null}
        onClose={closeDeleteConfirm}
        title={t("customViews.deleteModal.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
            >
              {t("customViews.cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canDelete}
              onClick={() => void handleConfirmDelete()}
            >
              {t("customViews.deleteModal.confirm")}
            </Button>
          </div>
        }
      >
        <Text>
          {t("customViews.deleteModal.message", {
            name: deleteTarget?.name ?? "",
          })}
        </Text>
      </Modal>
    </>
  );
}

interface CustomViewsViewProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function CustomViewsView({
  canCreate,
  canUpdate,
  canDelete,
}: CustomViewsViewProps) {
  const { t } = useTranslation("common");

  return (
    <CustomViewsProvider
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <BuilderPageShell
          title={t("customViews.title")}
          subtitle={t("customViews.subtitle")}
          bodyScrollable={false}
        >
          <CustomViewsWorkbench />
        </BuilderPageShell>
      </div>
    </CustomViewsProvider>
  );
}
