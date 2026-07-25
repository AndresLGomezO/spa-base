import { BuilderPageShell, Button, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { UserAiContextListTreePanel } from "./UserAiContextListTreePanel";
import { UserAiContextMetadataModal } from "./UserAiContextMetadataModal";
import { UserAiContextSettingsPanel } from "./UserAiContextSettingsPanel";
import {
  UserAiContextProvider,
  useUserAiContext,
} from "./user-ai-context-context";

function UserAiContextWorkbench() {
  const { t } = useTranslation("common");
  const {
    editor,
    metadataEditId,
    deleteTargetId,
    closeMetadataEdit,
    closeDeleteConfirm,
    canDelete,
  } = useUserAiContext();

  const deleteTarget = deleteTargetId
    ? editor.definitions.find((entry) => entry.id === deleteTargetId)
    : null;

  async function handleConfirmDelete() {
    if (!deleteTargetId) return;
    const error = await editor.deleteSection(deleteTargetId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("userAiContext.deleted"));
    closeDeleteConfirm();
  }

  if (editor.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("userAiContext.loading")}
      </Text>
    );
  }

  if (editor.loadError) {
    return <Text className="text-destructive text-sm">{editor.loadError}</Text>;
  }

  return (
    <>
      <div className={designerTreeTabRootClassName}>
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="shrink-0 min-w-0">
            <UserAiContextListTreePanel />
          </div>
          <div className={designerPreviewColumnClassName}>
            <UserAiContextSettingsPanel />
          </div>
        </div>
      </div>

      <UserAiContextMetadataModal
        mode="edit"
        open={metadataEditId !== null}
        sectionId={metadataEditId ?? undefined}
        onClose={closeMetadataEdit}
      />

      <Modal
        open={deleteTargetId !== null}
        onClose={closeDeleteConfirm}
        title={t("userAiContext.delete.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
            >
              {t("userAiContext.cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canDelete}
              onClick={() => void handleConfirmDelete()}
            >
              {t("userAiContext.delete.confirm")}
            </Button>
          </div>
        }
      >
        <Text className="text-sm">
          {t("userAiContext.delete.description", {
            name: deleteTarget?.name ?? "",
          })}
        </Text>
      </Modal>
    </>
  );
}

interface UserAiContextViewProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function UserAiContextView({
  canCreate,
  canUpdate,
  canDelete,
}: UserAiContextViewProps) {
  const { t } = useTranslation("common");

  return (
    <UserAiContextProvider
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <BuilderPageShell
          title={t("userAiContext.navTitle")}
          subtitle={t("userAiContext.description")}
          bodyScrollable={false}
        >
          <UserAiContextWorkbench />
        </BuilderPageShell>
      </div>
    </UserAiContextProvider>
  );
}
