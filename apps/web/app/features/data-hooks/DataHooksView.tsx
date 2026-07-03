import { BuilderPageShell, Button, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { DataHookListTreePanel } from "./DataHookListTreePanel";
import { DataHookMetadataModal } from "./DataHookMetadataModal";
import { DataHookPreviewPanel } from "./preview/DataHookPreviewPanel";
import { DataHookSettingsPanel } from "./DataHookSettingsPanel";
import { DataHooksProvider, useDataHooks } from "./data-hooks-context";

function DataHooksWorkbench() {
  const { t } = useTranslation("common");
  const {
    editor,
    metadataEditId,
    deleteTargetId,
    closeMetadataEdit,
    closeDeleteConfirm,
    canDelete,
  } = useDataHooks();

  const deleteTarget = deleteTargetId
    ? editor.definitions.find((entry) => entry.id === deleteTargetId)
    : null;

  async function handleConfirmDelete() {
    if (!deleteTargetId) {
      return;
    }
    const error = await editor.deleteHook(deleteTargetId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("dataHooks.deleted"));
    closeDeleteConfirm();
  }

  if (editor.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("dataHooks.loading")}
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
            <DataHookListTreePanel />
          </div>
          <div className="shrink-0 min-w-0">
            <DataHookPreviewPanel />
          </div>
          <div className={designerPreviewColumnClassName}>
            <DataHookSettingsPanel />
          </div>
        </div>
      </div>

      <DataHookMetadataModal
        mode="edit"
        open={metadataEditId !== null}
        hookId={metadataEditId ?? undefined}
        onClose={closeMetadataEdit}
      />

      <Modal
        open={deleteTargetId !== null}
        onClose={closeDeleteConfirm}
        title={t("dataHooks.delete.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
            >
              {t("dataHooks.cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canDelete}
              onClick={() => void handleConfirmDelete()}
            >
              {t("dataHooks.delete.confirm")}
            </Button>
          </div>
        }
      >
        <Text>
          {t("dataHooks.delete.message", { name: deleteTarget?.name ?? "" })}
        </Text>
      </Modal>
    </>
  );
}

interface DataHooksViewProps {
  readonly entityName: string;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function DataHooksView({
  entityName,
  canCreate,
  canUpdate,
  canDelete,
}: DataHooksViewProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const entity = entities.find((entry) => entry.name === entityName);
  const entityLabel = entity ? getEntityLabel(entity) : entityName;

  return (
    <DataHooksProvider
      entityName={entityName}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <BuilderPageShell
          title={t("dataHooks.title", { entity: entityLabel })}
          subtitle={t("dataHooks.description")}
          bodyScrollable={false}
        >
          <DataHooksWorkbench />
        </BuilderPageShell>
      </div>
    </DataHooksProvider>
  );
}
