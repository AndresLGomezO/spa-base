import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveActiveView } from "@repo/ui-builder";
import { Button, Heading, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useServerQueryConfig } from "../../hooks/useServerQueryConfig";
import { FormModal } from "../forms/FormModal";
import { WebDataViewToolbar } from "../data-view";
import { RequireEntityPermission } from "./RequireEntityPermission";
import { EntityForm, ENTITY_FORM_ID } from "./EntityForm";
import { EntityTable } from "./EntityTable";
import { ShareDialog } from "./ShareDialog";
import { resolveViewComponent } from "./view-component-registry";
import { useEntityListDataView } from "./useEntityListDataView";

const SERVER_PAGE_SIZE = 25;

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

  const { dataView, columnDescriptors, isLoadingRelations } =
    useEntityListDataView({
      entityName,
      items: [],
    });

  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor =
    cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : undefined;

  const prevControlsRef = useRef({
    search: dataView.search,
    filters: dataView.filters,
    sortColumnId: dataView.sort.columnId,
    sortDirection: dataView.sort.direction,
  });

  useEffect(() => {
    const prev = prevControlsRef.current;
    const changed =
      prev.search !== dataView.search ||
      prev.filters !== dataView.filters ||
      prev.sortColumnId !== dataView.sort.columnId ||
      prev.sortDirection !== dataView.sort.direction;

    if (changed) {
      setCursorStack([]);
      prevControlsRef.current = {
        search: dataView.search,
        filters: dataView.filters,
        sortColumnId: dataView.sort.columnId,
        sortDirection: dataView.sort.direction,
      };
    }
  }, [
    dataView.search,
    dataView.filters,
    dataView.sort.columnId,
    dataView.sort.direction,
  ]);

  const queryConfig = useServerQueryConfig({
    search: dataView.search,
    filters: dataView.filters,
    sort: dataView.sort,
    limit: SERVER_PAGE_SIZE,
    cursor: currentCursor,
  });

  const entityState = useEntity(entityName, { queryConfig });

  const serverPage = cursorStack.length + 1;
  const hasNextPage = !!entityState.nextCursor;

  const goToNextPage = useCallback(() => {
    if (entityState.nextCursor) {
      setCursorStack((prev) => [...prev, entityState.nextCursor!]);
    }
  }, [entityState.nextCursor]);

  const goToPreviousPage = useCallback(() => {
    setCursorStack((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareRecordId, setShareRecordId] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<EntityFormModalState>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const closeFormModal = useCallback(() => {
    setFormModal(null);
    setIsFormSubmitting(false);
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

  const listViewProps = {
    entityName,
    entityState: {
      ...entityState,
      isLoading: entityState.isLoading || isLoadingRelations,
    },
    page: serverPage,
    pageSize: SERVER_PAGE_SIZE,
    onPageChange: (page: number) => {
      if (page > serverPage) {
        goToNextPage();
      } else if (page < serverPage) {
        goToPreviousPage();
      }
    },
    hasNextPage,
    hasPreviousPage: cursorStack.length > 0,
    onRequestDelete: permissions.canDelete ? setDeleteId : undefined,
    onRequestEdit: permissions.canUpdate
      ? (id: string) => setFormModal({ mode: "edit", recordId: id })
      : undefined,
    onRequestShare: setShareRecordId,
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
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeFormModal}>
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

      <ShareDialog
        entityName={entityName}
        recordId={shareRecordId ?? ""}
        open={shareRecordId !== null}
        onClose={() => setShareRecordId(null)}
      />
    </div>
  );
}
