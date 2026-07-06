import { BuilderPageShell, Button, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import {
  EntityQueryBuilderProvider,
  useEntityQueryBuilder,
} from "./entity-query-builder-context";
import { EntityQueryListTreePanel } from "./EntityQueryListTreePanel";
import { EntityQueryMetadataModal } from "./EntityQueryMetadataModal";
import { EntityQuerySettingsPanel } from "./EntityQuerySettingsPanel";

function EntityQueryBuilderWorkbench() {
  const { t } = useTranslation("common");
  const {
    editor,
    metadataEditId,
    deleteTargetId,
    closeMetadataEdit,
    closeDeleteConfirm,
    canDelete,
  } = useEntityQueryBuilder();

  const deleteTarget = deleteTargetId
    ? editor.definitions.find((entry) => entry.id === deleteTargetId)
    : null;

  async function handleConfirmDelete() {
    if (!deleteTargetId) {
      return;
    }

    const error = await editor.deleteQuery(deleteTargetId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("queryBuilder.deleted"));
    closeDeleteConfirm();
  }

  if (editor.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("queryBuilder.loading")}
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
          <EntityQueryListTreePanel />
          <div className={designerPreviewColumnClassName}>
            <EntityQuerySettingsPanel />
          </div>
        </div>
      </div>

      <EntityQueryMetadataModal
        mode="edit"
        open={metadataEditId !== null}
        queryId={metadataEditId ?? undefined}
        onClose={closeMetadataEdit}
      />

      <Modal
        open={deleteTargetId !== null}
        onClose={closeDeleteConfirm}
        title={t("queryBuilder.delete.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
            >
              {t("queryBuilder.cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canDelete}
              onClick={() => void handleConfirmDelete()}
            >
              {t("queryBuilder.delete.confirm")}
            </Button>
          </div>
        }
      >
        <Text>
          {t("queryBuilder.delete.message", {
            name: deleteTarget?.name ?? "",
          })}
        </Text>
      </Modal>
    </>
  );
}

function EntityQueryBuilderPageContent() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BuilderPageShell
        title={t("queryBuilder.title")}
        subtitle={t("queryBuilder.description")}
        bodyScrollable={false}
      >
        <EntityQueryBuilderWorkbench />
      </BuilderPageShell>
    </div>
  );
}

interface EntityQueryBuilderViewProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function EntityQueryBuilderView({
  canCreate,
  canUpdate,
  canDelete,
}: EntityQueryBuilderViewProps) {
  return (
    <EntityQueryBuilderProvider
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    >
      <EntityQueryBuilderPageContent />
    </EntityQueryBuilderProvider>
  );
}
