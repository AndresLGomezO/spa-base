import { useCallback, useEffect, useMemo, useState } from "react";
import type { QueryConfig } from "@repo/query-engine";
import { resolveActiveView } from "@repo/ui-builder";
import { Button, Heading, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { FormModal } from "../forms/FormModal";
import { RequireEntityPermission } from "./RequireEntityPermission";
import { EntityForm } from "./EntityForm";
import { EntityTable } from "./EntityTable";
import { resolveViewComponent } from "./view-component-registry";

type EntityFormModalState =
  | null
  | { mode: "create" }
  | { mode: "edit"; recordId: string };

interface EntityPageProps {
  readonly entityName: EntityName;
}

export function EntityPage({ entityName }: EntityPageProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const permissions = useEntityPermissions(entityName);
  const activeView = useMemo(() => resolveActiveView(definition), [definition]);
  const ViewComponent = resolveViewComponent(activeView.type) ?? EntityTable;
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryConfig, setQueryConfig] = useState<QueryConfig>(() => ({
    pagination: { limit: 20 },
  }));
  const entityState = useEntity(entityName, { queryConfig });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<EntityFormModalState>(null);

  const closeFormModal = useCallback(() => {
    setFormModal(null);
    if (searchParams.has("create") || searchParams.has("edit")) {
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      next.delete("edit");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.has("create") && permissions.canCreate) {
      setFormModal({ mode: "create" });
      return;
    }
    const editId = searchParams.get("edit");
    if (editId && permissions.canUpdate) {
      setFormModal({ mode: "edit", recordId: editId });
    }
  }, [permissions.canCreate, permissions.canUpdate, searchParams]);

  const handleQueryConfigChange = useCallback((nextConfig: QueryConfig) => {
    setQueryConfig(nextConfig);
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const deleted = await entityState.remove(deleteId);
    if (deleted) {
      toast.success(t("entity.deleteSuccess"));
    }
    setDeleteId(null);
  };

  const formModalTitle = useMemo(() => {
    if (!formModal) return "";
    const entity = getEntityLabel(definition);
    return formModal.mode === "create"
      ? t("entity.createTitle", { entity })
      : t("entity.editTitle", { entity });
  }, [definition, formModal, t]);

  const listViewProps = {
    entityName,
    entityState,
    onQueryConfigChange: handleQueryConfigChange,
    onRequestDelete: permissions.canDelete ? setDeleteId : undefined,
    onRequestEdit: permissions.canUpdate
      ? (id: string) => setFormModal({ mode: "edit", recordId: id })
      : undefined,
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Heading level={1}>{getEntityLabel(definition)}</Heading>
        {permissions.canCreate ? (
          <Button
            type="button"
            onClick={() => setFormModal({ mode: "create" })}
          >
            {t("entity.create")}
          </Button>
        ) : null}
      </div>

      <ViewComponent {...listViewProps} />

      {formModal ? (
        <FormModal
          open
          onClose={closeFormModal}
          title={formModalTitle}
          size="lg"
        >
          {formModal.mode === "create" ? (
            <RequireEntityPermission entityName={entityName} action="create">
              <EntityForm
                entityName={entityName}
                mode="create"
                onCancel={closeFormModal}
                onSuccess={closeFormModal}
              />
            </RequireEntityPermission>
          ) : (
            <RequireEntityPermission entityName={entityName} action="update">
              <EntityForm
                key={formModal.recordId}
                entityName={entityName}
                mode="edit"
                recordId={formModal.recordId}
                onCancel={closeFormModal}
                onSuccess={closeFormModal}
              />
            </RequireEntityPermission>
          )}
        </FormModal>
      ) : null}

      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title={t("entity.confirmDeleteTitle")}
      >
        <Text>{t("entity.confirmDelete")}</Text>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            loading={entityState.isSubmitting}
            onClick={() => void handleDelete()}
          >
            {t("entity.delete")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteId(null)}
          >
            {t("entity.cancel")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
