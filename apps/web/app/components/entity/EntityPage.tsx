import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useDataViewControls, useDataViewUrlState } from "@repo/data-view";
import { Button, Heading, Modal, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

import {
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  resolveFormModalChrome,
  resolveFormModalFooterLayout,
  resolveFormModalHasLayoutActions,
  resolveFormModalSize,
  resolveFormUsesModalBuilderFooter,
} from "@repo/entities";

import { useAnyPermission } from "../../auth/useAnyPermission";
import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useEntityFilterOptions } from "../../hooks/useEntityFilterOptions";
import { useServerQueryConfig } from "../../hooks/useServerQueryConfig";
import { FormModal } from "../forms/FormModal";
import { WebDataViewToolbar } from "../data-view";
import { RequireEntityPermission } from "./RequireEntityPermission";
import { EntityForm, ENTITY_FORM_ID } from "./EntityForm";
import { EntityTable } from "./EntityTable";
import { ShareDialog } from "./ShareDialog";
import { resolveViewComponent } from "./view-component-registry";
import { resolveRelationFilterValues } from "./resolve-relation-filter-values";
import { entityHasSearchableColumns } from "./entity-list-search";
import { useEntityColumnDescriptors } from "./useEntityColumnDescriptors";
import {
  metricStripHasContent,
  metricStripLayoutFromView,
} from "@repo/entities";
import { EntityViewMetricsStrip } from "../metrics/EntityViewMetricsStrip";
import { designLayoutEntityPath } from "../../routing/design-layout-nav";
import { createEntityMainPageRenderContext } from "../../features/ui-builder/create-entity-main-page-render-context";

const SERVER_PAGE_SIZE = 10;

type EntityFormModalState =
  | null
  | { mode: "create" }
  | { mode: "edit"; recordId: string };

interface EntityPageProps {
  readonly entityName: EntityName;
}

function serializeFilters(
  filters: Readonly<Record<string, readonly string[]>>,
): string {
  return JSON.stringify(
    Object.entries(filters)
      .filter(([, values]) => values.length > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => [key, [...values].sort()]),
  );
}

export function EntityPage({ entityName }: EntityPageProps) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const definition = useEntityDefinition(entityName);
  const permissions = useEntityPermissions(entityName);
  const canConfigureView = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );
  const listPresentation = definition.ui.listViewType ?? "table";

  const ViewComponent = (() => {
    if (listPresentation === "card") {
      return resolveViewComponent("card") ?? EntityTable;
    }
    if (
      listPresentation === "expandableTable" ||
      listPresentation === ("compact" as typeof listPresentation)
    ) {
      return resolveViewComponent("expandableTable") ?? EntityTable;
    }
    return resolveViewComponent("table") ?? EntityTable;
  })();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const columnDescriptors = useEntityColumnDescriptors(entityName);
  const showSearch = useMemo(
    () => entityHasSearchableColumns(columnDescriptors),
    [columnDescriptors],
  );
  const urlState = useDataViewUrlState(columnDescriptors);
  const {
    search,
    filters,
    sort,
    page,
    setSearch,
    setFilter,
    setSortColumn,
    toggleSortDirection,
    setPage,
    clearAll,
  } = urlState;

  const { filterOptions, relationFilterOptions } = useEntityFilterOptions({
    definition,
    columns: columnDescriptors,
    filters,
    booleanLabels: {
      trueLabel: t("table.booleanYes"),
      falseLabel: t("table.booleanNo"),
    },
  });

  const pageOffset = (page - 1) * SERVER_PAGE_SIZE;

  const fieldTypes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(definition.fields).map(([name, meta]) => [
          name,
          meta.type,
        ]),
      ),
    [definition.fields],
  );

  const serverFilters = useMemo(
    () =>
      resolveRelationFilterValues(filters, definition, relationFilterOptions),
    [filters, definition, relationFilterOptions],
  );

  const filtersKey = serializeFilters(serverFilters);
  const prevControlsRef = useRef({
    search,
    filtersKey,
    sortColumnId: sort.columnId,
    sortDirection: sort.direction,
  });

  useEffect(() => {
    const prev = prevControlsRef.current;
    const changed =
      prev.search !== search ||
      prev.filtersKey !== filtersKey ||
      prev.sortColumnId !== sort.columnId ||
      prev.sortDirection !== sort.direction;

    if (changed) {
      if (page !== 1) {
        setPage(1);
      }
      prevControlsRef.current = {
        search,
        filtersKey,
        sortColumnId: sort.columnId,
        sortDirection: sort.direction,
      };
    }
  }, [search, filtersKey, sort.columnId, sort.direction, page, setPage]);

  const queryConfig = useServerQueryConfig({
    search: showSearch ? search : "",
    filters: serverFilters,
    sort,
    limit: SERVER_PAGE_SIZE,
    offset: pageOffset,
    fieldTypes,
  });

  const entityState = useEntity(entityName, {
    queryConfig,
    page,
  });

  const listItems = entityState.items as readonly Record<string, unknown>[];

  const dataViewControls = useDataViewControls(listItems, columnDescriptors, {
    controlled: {
      search,
      filters,
      sort,
      onSearchChange: setSearch,
      onFilterChange: setFilter,
      onSortColumnChange: setSortColumn,
      onToggleSortDirection: toggleSortDirection,
      onClearAll: clearAll,
    },
  });

  useEffect(() => {
    if (entityState.isLoading) {
      return;
    }

    const totalPages =
      entityState.totalCount === 0
        ? 1
        : Math.ceil(entityState.totalCount / SERVER_PAGE_SIZE);

    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [entityState.isLoading, entityState.totalCount, page, setPage]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareRecordId, setShareRecordId] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<EntityFormModalState>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [formModalFooter, setFormModalFooter] = useState<ReactNode>(null);

  const formModalChrome = useMemo(
    () => resolveFormModalChrome(definition),
    [definition],
  );
  const formModalFooterLayout = useMemo(
    () => resolveFormModalFooterLayout(definition),
    [definition],
  );
  const useDesignedFormModalFooter = useMemo(
    () =>
      resolveFormUsesModalBuilderFooter(definition) &&
      (formModalFooterLayout != null ||
        resolveFormModalHasLayoutActions(definition)),
    [definition, formModalFooterLayout],
  );

  const closeFormModal = useCallback(() => {
    setFormModal(null);
    setIsFormSubmitting(false);
    setFormModalFooter(null);
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

  const legacyFormModalFooter = (
    <div className="flex gap-2">
      <Button type="button" variant="outline" onClick={closeFormModal}>
        {t("entity.cancel")}
      </Button>
      <Button type="submit" form={ENTITY_FORM_ID} loading={isFormSubmitting}>
        {t("entity.save")}
      </Button>
    </div>
  );

  const formModalSharedProps = {
    modalActionPlacement: useDesignedFormModalFooter
      ? ("footer" as const)
      : ("inline" as const),
    modalFooterLayout: formModalFooterLayout,
    flushContent: formModalChrome.contentPadding === "none",
    onFooterChange: useDesignedFormModalFooter ? setFormModalFooter : undefined,
    hideActions: !useDesignedFormModalFooter,
    onSubmittingChange: setIsFormSubmitting,
    onCancel: closeFormModal,
    onSuccess: closeFormModal,
  };

  const routeParams = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  const tableView = useMemo(
    () => definition.ui.views.find((view) => view.type === "table"),
    [definition.ui.views],
  );
  const metricStripLayout = useMemo(
    () =>
      metricStripLayoutFromView(
        tableView?.type === "table" ? tableView.metricStripLayout : undefined,
      ),
    [tableView],
  );
  const showMetricsStrip = metricStripHasContent(metricStripLayout);
  const mainPageLayout = definition.ui.mainPageLayout;

  const listViewProps = useMemo(
    () => ({
      entityName,
      entityState,
      page,
      pageSize: SERVER_PAGE_SIZE,
      onPageChange: setPage,
      onRequestDelete: permissions.canDelete ? setDeleteId : undefined,
      onRequestEdit: permissions.canUpdate
        ? (id: string) => setFormModal({ mode: "edit", recordId: id })
        : undefined,
      onRequestShare: setShareRecordId,
      listFilters: filters,
      routeParams,
    }),
    [
      entityName,
      entityState,
      page,
      setPage,
      permissions.canDelete,
      permissions.canUpdate,
      filters,
      routeParams,
    ],
  );

  const mainPageContext = useMemo(
    () =>
      createEntityMainPageRenderContext({
        entityName,
        entityLabel: getEntityLabel(definition),
        locale: i18n.language,
        canCreate: permissions.canCreate,
        entityDefinition: definition,
        metricStripLayout,
        listFilters: filters,
        routeParams,
        toolbar: {
          search,
          setSearch,
          filters,
          setFilter,
          sort,
          setSortColumn,
          toggleSortDirection,
          filterOptions,
          activeBadges: dataViewControls.activeBadges,
          clearAll,
          columns: columnDescriptors as Parameters<
            typeof WebDataViewToolbar
          >[0]["columns"],
          filtersOpen,
          onFiltersOpenChange: setFiltersOpen,
          showSearch,
        },
        ViewComponent: ViewComponent as unknown as ComponentType<
          Record<string, unknown>
        >,
        listViewProps,
        onCreate: () => setFormModal({ mode: "create" }),
      }),
    [
      clearAll,
      columnDescriptors,
      dataViewControls.activeBadges,
      definition,
      entityName,
      filterOptions,
      filters,
      filtersOpen,
      i18n.language,
      listViewProps,
      metricStripLayout,
      permissions.canCreate,
      routeParams,
      search,
      setFilter,
      setSearch,
      setSortColumn,
      showSearch,
      sort,
      toggleSortDirection,
      ViewComponent,
    ],
  );

  const pageHeader = (
    <div className="flex shrink-0 items-center justify-between gap-4">
      <Heading level={1}>{getEntityLabel(definition)}</Heading>
      <div className="flex items-center gap-2">
        {canConfigureView ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(designLayoutEntityPath("main", entityName))}
          >
            {t("entity.openDesignLayout")}
          </Button>
        ) : null}
        {permissions.canCreate ? (
          <Button
            type="button"
            onClick={() => setFormModal({ mode: "create" })}
          >
            {t("entity.create")}
          </Button>
        ) : null}
      </div>
    </div>
  );

  const legacyMainBody = (
    <>
      <div className="shrink-0">
        <WebDataViewToolbar
          search={search}
          setSearch={setSearch}
          filters={filters}
          setFilter={setFilter}
          sort={sort}
          setSortColumn={setSortColumn}
          toggleSortDirection={toggleSortDirection}
          filterOptions={filterOptions}
          activeBadges={dataViewControls.activeBadges}
          clearAll={clearAll}
          columns={columnDescriptors}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          showSearch={showSearch}
        />
      </div>

      {showMetricsStrip ? (
        <EntityViewMetricsStrip
          stripLayout={metricStripLayout}
          entityDefinition={definition}
          context={{ listFilters: filters, routeParams }}
          locale={i18n.language}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <ViewComponent {...listViewProps} />
      </div>
    </>
  );

  return (
    <div className="flex min-h-full w-full flex-col gap-6">
      {pageHeader}

      {mainPageLayout ? (
        <RecursiveLayoutRenderer
          layout={mainPageLayout}
          context={mainPageContext}
        />
      ) : (
        legacyMainBody
      )}

      {formModal ? (
        <FormModal
          open
          onClose={closeFormModal}
          title={formModalTitle}
          size={resolveFormModalSize(definition)}
          showHeader={formModalChrome.showHeader}
          showCloseButton={formModalChrome.showHeader}
          contentPadding={formModalChrome.contentPadding}
          footer={
            useDesignedFormModalFooter ? formModalFooter : legacyFormModalFooter
          }
        >
          {formModal.mode === "create" ? (
            <RequireEntityPermission entityName={entityName} action="create">
              <EntityForm
                entityName={entityName}
                mode="create"
                {...formModalSharedProps}
              />
            </RequireEntityPermission>
          ) : (
            <RequireEntityPermission entityName={entityName} action="update">
              <EntityForm
                key={formModal.recordId}
                entityName={entityName}
                mode="edit"
                recordId={formModal.recordId}
                {...formModalSharedProps}
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
