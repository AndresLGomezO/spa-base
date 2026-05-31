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
import { WebDataViewToolbar } from "../data-view";
import { RequireEntityPermission } from "./RequireEntityPermission";
import { EntityForm, ENTITY_FORM_ID } from "./EntityForm";
import { EntityTable } from "./EntityTable";
import { ShareDialog } from "./ShareDialog";
import { getRecordAccess } from "../../hooks/useRecordAccess";
import { resolveViewComponent } from "./view-component-registry";
import { useEntityListDataView } from "./useEntityListDataView";

const ENTITY_LIST_LIMIT = 100;
const CLIENT_PAGE_SIZE = 20;

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

  const queryConfig = useMemo<QueryConfig>(
    () => ({
      pagination: { limit: ENTITY_LIST_LIMIT, offset: 0 },
    }),
    [],
  );

  const entityState = useEntity(entityName, { queryConfig });
  const { dataView, columnDescriptors, isLoadingRelations } =
    useEntityListDataView({
      entityName,
      items: entityState.items as readonly Record<string, unknown>[],
    });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<EntityFormModalState>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editRecordAccess, setEditRecordAccess] = useState<ReturnType<
    typeof getRecordAccess
  > | null>(null);

  const closeFormModal = useCallback(() => {
    setFormModal(null);
    setIsFormSubmitting(false);
    setShareOpen(false);
    setEditRecordAccess(null);
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

  const warningMessage =
    entityState.totalCount > ENTITY_LIST_LIMIT
      ? t("dataView.truncatedDatasetWarning")
      : undefined;

  const listViewProps = {
    entityName,
    entityState: {
      ...entityState,
      items: dataView.pageItems as typeof entityState.items,
      totalCount: dataView.totalCount,
      isLoading: entityState.isLoading || isLoadingRelations,
    },
    page: dataView.page,
    pageSize: CLIENT_PAGE_SIZE,
    onPageChange: dataView.setPage,
    onRequestDelete: permissions.canDelete ? setDeleteId : undefined,
    onRequestEdit: permissions.canUpdate
      ? (id: string) => setFormModal({ mode: "edit", recordId: id })
      : undefined,
  };

  return (
    <div className="flex w-full min-h-0 flex-col gap-6">
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

      {!entityState.isLoading && !isLoadingRelations ? (
        <WebDataViewToolbar
          {...dataView}
          columns={columnDescriptors}
          filtersOpen={dataView.filtersOpen}
          onFiltersOpenChange={dataView.setFiltersOpen}
          warningMessage={warningMessage}
        />
      ) : null}

      <ViewComponent {...listViewProps} />

      {formModal ? (
        <FormModal
          open
          onClose={closeFormModal}
          title={formModalTitle}
          size="lg"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {formModal.mode === "edit" &&
                editRecordAccess?.canManageShares ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShareOpen(true)}
                  >
                    {t("entity.share")}
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeFormModal}
                >
                  {t("entity.cancel")}
                </Button>
                <Button
                  type="submit"
                  form={ENTITY_FORM_ID}
                  loading={isFormSubmitting}
                >
                  {t("entity.save")}
                </Button>
              </div>
            </div>
          }
        >
          {formModal.mode === "create" ? (
            <RequireEntityPermission entityName={entityName} action="create">
              <EntityForm
                entityName={entityName}
                mode="create"
                hideActions
                onSubmittingChange={setIsFormSubmitting}
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
                hideActions
                onSubmittingChange={setIsFormSubmitting}
                onCancel={closeFormModal}
                onSuccess={closeFormModal}
                onRecordLoaded={(record) =>
                  setEditRecordAccess(getRecordAccess(record))
                }
              />
            </RequireEntityPermission>
          )}
        </FormModal>
      ) : null}

      {formModal?.mode === "edit" ? (
        <ShareDialog
          entityName={entityName}
          recordId={formModal.recordId}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
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
