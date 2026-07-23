import { BuilderPageShell, Button, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { bindingDisplayName } from "./email-matching-draft";
import {
  EmailMatchingProvider,
  useEmailMatching,
} from "./email-matching-context";
import { EmailMatchingListTreePanel } from "./EmailMatchingListTreePanel";
import { EmailMatchingMetadataModal } from "./EmailMatchingMetadataModal";
import { EmailMatchingPreviewPanel } from "./preview/EmailMatchingPreviewPanel";
import { EmailMatchingSettingsPanel } from "./EmailMatchingSettingsPanel";

function EmailMatchingWorkbench() {
  const { t } = useTranslation("common");
  const {
    editor,
    metadataEditId,
    deleteTargetId,
    closeMetadataEdit,
    closeDeleteConfirm,
    canDelete,
  } = useEmailMatching();

  const deleteTarget = deleteTargetId
    ? editor.bindings.find((entry) => entry.id === deleteTargetId)
    : null;

  async function handleConfirmDelete() {
    if (!deleteTargetId) {
      return;
    }
    const error = await editor.deleteBinding(deleteTargetId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("emailMatchingWorkbench.deleted"));
    closeDeleteConfirm();
  }

  if (editor.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("emailMatchingWorkbench.loading")}
      </Text>
    );
  }

  if (editor.loadError) {
    return (
      <Text className="text-destructive text-sm">{editor.loadError}</Text>
    );
  }

  return (
    <>
      <div className={designerTreeTabRootClassName}>
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="shrink-0 min-w-0">
            <EmailMatchingListTreePanel />
          </div>
          <div className="shrink-0 min-w-0">
            <EmailMatchingPreviewPanel />
          </div>
          <div className={designerPreviewColumnClassName}>
            <EmailMatchingSettingsPanel />
          </div>
        </div>
      </div>

      <EmailMatchingMetadataModal
        mode="edit"
        open={metadataEditId !== null}
        bindingId={metadataEditId ?? undefined}
        onClose={closeMetadataEdit}
      />

      <Modal
        open={deleteTargetId !== null}
        onClose={closeDeleteConfirm}
        title={t("emailMatchingWorkbench.delete.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
            >
              {t("emailMatchingWorkbench.cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canDelete}
              onClick={() => void handleConfirmDelete()}
            >
              {t("emailMatchingWorkbench.delete.confirm")}
            </Button>
          </div>
        }
      >
        <Text>
          {t("emailMatchingWorkbench.delete.message", {
            name: deleteTarget ? bindingDisplayName(deleteTarget) : "",
          })}
        </Text>
      </Modal>
    </>
  );
}

interface EmailMatchingViewProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function EmailMatchingView({
  canCreate,
  canUpdate,
  canDelete,
}: EmailMatchingViewProps) {
  const { t } = useTranslation("common");

  return (
    <EmailMatchingProvider
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <BuilderPageShell
          title={t("emailMatchingWorkbench.title")}
          subtitle={t("emailMatchingWorkbench.description")}
          bodyScrollable={false}
        >
          <EmailMatchingWorkbench />
        </BuilderPageShell>
      </div>
    </EmailMatchingProvider>
  );
}
