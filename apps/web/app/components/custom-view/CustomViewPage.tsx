import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";
import { EntityMainPageShell } from "../entity/EntityMainPageShell";
import { useDataViewControls, useDataViewUrlState } from "@repo/data-view";
import { Alert, Button, Modal, PageLoader, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

import {
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  metricStripHasContent,
  resolveEntityPageCreateFormDesignId,
  resolveEntityPageEditFormDesignId,
} from "@repo/entities";

import { cn } from "@repo/theme/utils";

import { useAnyPermission } from "../../auth/useAnyPermission";
import { useCustomViewByViewId } from "../../custom-views/custom-view-catalog-context";
import {
  buildCustomViewPageDefinition,
  getCustomViewLabel,
} from "../../custom-views/custom-view-definition";
import { useCustomViewSourceDefinition } from "../../custom-views/use-custom-view-source-definition";
import type {
  EntityCatalogEntry,
  EntityName,
} from "../../entities/entity-catalog";
import { useCustomViewMergedQueryConfig } from "../../custom-views/use-custom-view-merged-query-config";
import {
  EntityDefinitionOverrideProvider,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useEntityFilterOptions } from "../../hooks/useEntityFilterOptions";
import { WebDataViewToolbar } from "../data-view/WebDataViewToolbar";
import { EntityTable } from "../entity/EntityTable";
import { ShareDialog } from "../entity/ShareDialog";
import { resolveViewComponent } from "../entity/view-component-registry";
import { resolveRelationFilterValues } from "../entity/resolve-relation-filter-values";
import { entityHasSearchableColumns } from "../entity/entity-list-search";
import { useEntityColumnDescriptors } from "../entity/useEntityColumnDescriptors";
import { designLayoutCustomViewPath } from "../../routing/design-layout-nav";
import {
  parseEntityCreateFormPrefill,
  stripEntityFormModalSearchParams,
} from "../../routing/parse-entity-create-form-prefill";
import { createEntityMainPageRenderContext } from "../../features/ui-builder/create-entity-main-page-render-context";
import { createDefaultMetricRowLayout } from "../../features/ui-builder/create-default-metric-row-layout";
import { EntityViewMetricsStrip } from "../metrics/EntityViewMetricsStrip";
import { EntityPageCompactHeader } from "../entity/EntityPageCompactHeader";
import { EntityPageCompactMetrics } from "../entity/EntityPageCompactMetrics";
import { EntityPageCompactToolbar } from "../entity/EntityPageCompactToolbar";
import {
  EntityPageListScrollContainer,
  EntityPageScrollCompactProvider,
  ENTITY_PAGE_CHROME_TRANSITION,
  useEntityPageScrollCompact,
} from "../entity/entity-page-scroll-compact";
import { useEntityFormModal } from "../entity/entity-form-modal-context";

const SERVER_PAGE_SIZE = 10;

interface CustomViewPageProps {
  readonly viewId: string;
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

export function CustomViewPage({ viewId }: CustomViewPageProps) {
  return (
    <EntityPageScrollCompactProvider>
      <CustomViewPageInner viewId={viewId} />
    </EntityPageScrollCompactProvider>
  );
}

function CustomViewPageInner({ viewId }: CustomViewPageProps) {
  const { t } = useTranslation("common");
  const {
    customView,
    isLoading: isCustomViewLoading,
    error: customViewError,
  } = useCustomViewByViewId(viewId);
  const sourceEntityName = customView?.sourceEntity;
  const {
    definition: sourceDefinition,
    isLoading: isSourceDefinitionLoading,
    error: sourceDefinitionError,
  } = useCustomViewSourceDefinition(sourceEntityName);

  if (isCustomViewLoading || isSourceDefinitionLoading) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (customViewError || sourceDefinitionError) {
    return <Alert>{customViewError ?? sourceDefinitionError}</Alert>;
  }

  if (!customView || !sourceDefinition) {
    return <Alert>{t("customViews.notFound")}</Alert>;
  }

  const pageDefinition = buildCustomViewPageDefinition(
    sourceDefinition,
    customView,
  );

  return (
    <EntityDefinitionOverrideProvider definition={pageDefinition}>
      <CustomViewPageContent
        viewId={viewId}
        customView={customView}
        sourceDefinition={sourceDefinition}
        entityName={sourceDefinition.name as EntityName}
        pageLabel={getCustomViewLabel(customView)}
      />
    </EntityDefinitionOverrideProvider>
  );
}

function CustomViewPageContent({
  viewId,
  customView,
  sourceDefinition,
  entityName,
  pageLabel,
}: {
  readonly viewId: string;
  readonly customView: NonNullable<
    ReturnType<typeof useCustomViewByViewId>["customView"]
  >;
  readonly sourceDefinition: EntityCatalogEntry;
  readonly entityName: EntityName;
  readonly pageLabel: string;
}) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const definition = useEntityDefinition(entityName);
  const permissions = useEntityPermissions(entityName);
  const { openEntityFormModal } = useEntityFormModal();
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

  const {
    queryConfig,
    isLoading: isQueryConfigLoading,
    error: queryConfigError,
  } = useCustomViewMergedQueryConfig({
    customView,
    sourceDefinition,
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
    enabled: queryConfig !== undefined,
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

  const stripUrlFormModalParams = useCallback(() => {
    setSearchParams(
      (current) => stripEntityFormModalSearchParams(current, definition),
      { replace: true },
    );
  }, [definition, setSearchParams]);

  const openCreateFormModal = useCallback(() => {
    openEntityFormModal({
      entityName,
      mode: "create",
      formDesignId: resolveEntityPageCreateFormDesignId(definition),
    });
  }, [definition, entityName, openEntityFormModal]);

  const openEditFormModal = useCallback(
    (recordId: string) => {
      openEntityFormModal({
        entityName,
        mode: "edit",
        recordId,
        formDesignId: resolveEntityPageEditFormDesignId(definition),
      });
    },
    [definition, entityName, openEntityFormModal],
  );

  const syncedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const urlKey = searchParams.toString();
    if (syncedUrlRef.current === urlKey) {
      return;
    }

    if (searchParams.has("create") && permissions.canCreate) {
      syncedUrlRef.current = urlKey;
      openEntityFormModal({
        entityName,
        mode: "create",
        createPrefill: parseEntityCreateFormPrefill(searchParams, definition),
        formDesignId: resolveEntityPageCreateFormDesignId(definition),
        onClose: stripUrlFormModalParams,
      });
      return;
    }

    const editId = searchParams.get("edit");
    if (editId && permissions.canUpdate) {
      syncedUrlRef.current = urlKey;
      openEntityFormModal({
        entityName,
        mode: "edit",
        recordId: editId,
        formDesignId: resolveEntityPageEditFormDesignId(definition),
        onClose: stripUrlFormModalParams,
      });
      return;
    }

    syncedUrlRef.current = urlKey;
  }, [
    definition,
    entityName,
    openEntityFormModal,
    permissions.canCreate,
    permissions.canUpdate,
    searchParams,
    stripUrlFormModalParams,
  ]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const deleted = await entityState.remove(deleteId);
    if (deleted) {
      toast.success(t("entity.deleteSuccess"));
    }
    setDeleteId(null);
  };

  const routeParams = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  const metricRowLayout = useMemo(
    () => definition.ui.metricRowLayout ?? createDefaultMetricRowLayout(),
    [definition.ui.metricRowLayout],
  );
  const showMetricsStrip = metricStripHasContent(metricRowLayout);
  const mainPageLayout = definition.ui.mainPageLayout;

  const listViewProps = useMemo(
    () => ({
      entityName,
      entityState,
      page,
      pageSize: SERVER_PAGE_SIZE,
      onPageChange: setPage,
      onRequestDelete: permissions.canDelete ? setDeleteId : undefined,
      onRequestEdit: permissions.canUpdate ? openEditFormModal : undefined,
      onRequestShare: setShareRecordId,
      listFilters: filters,
      routeParams,
    }),
    [
      entityName,
      entityState,
      page,
      setPage,
      openEditFormModal,
      permissions.canDelete,
      permissions.canUpdate,
      filters,
      routeParams,
    ],
  );

  const { registerScrollContainer, isCompact } = useEntityPageScrollCompact();

  const mainPageContext = useMemo(
    () =>
      createEntityMainPageRenderContext({
        entityName,
        entityLabel: pageLabel,
        locale: i18n.language,
        canCreate: permissions.canCreate,
        entityDefinition: definition,
        metricRowLayout,
        listFilters: filters,
        routeParams,
        registerPageListScrollElement: registerScrollContainer,
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
          columns: columnDescriptors as ComponentProps<
            typeof WebDataViewToolbar
          >["columns"],
          filtersOpen,
          onFiltersOpenChange: setFiltersOpen,
          showSearch,
        },
        ViewComponent: ViewComponent as unknown as ComponentType<
          Record<string, unknown>
        >,
        listViewProps,
        onCreate: openCreateFormModal,
        designLayoutMainPath: designLayoutCustomViewPath("main", viewId),
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
      metricRowLayout,
      openCreateFormModal,
      pageLabel,
      permissions.canCreate,
      registerScrollContainer,
      routeParams,
      search,
      setFilter,
      setSearch,
      setSortColumn,
      showSearch,
      sort,
      toggleSortDirection,
      ViewComponent,
      viewId,
    ],
  );

  const toolbarProps: Omit<
    ComponentProps<typeof WebDataViewToolbar>,
    "labels"
  > = {
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
    columns: columnDescriptors as ComponentProps<
      typeof WebDataViewToolbar
    >["columns"],
    filtersOpen,
    onFiltersOpenChange: setFiltersOpen,
    showSearch,
  };

  const legacyMainBody = (
    <>
      <EntityPageCompactToolbar toolbar={toolbarProps} />

      {showMetricsStrip ? (
        <EntityPageCompactMetrics>
          <EntityViewMetricsStrip
            rowLayout={metricRowLayout}
            entityDefinition={definition}
            context={{ listFilters: filters, routeParams }}
            locale={i18n.language}
          />
        </EntityPageCompactMetrics>
      ) : null}

      <EntityPageListScrollContainer>
        <ViewComponent {...listViewProps} />
      </EntityPageListScrollContainer>
    </>
  );

  if (isQueryConfigLoading) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (queryConfigError) {
    return <Alert>{queryConfigError}</Alert>;
  }

  return (
    <div
      className={cn(
        "relative z-0 flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden",
        ENTITY_PAGE_CHROME_TRANSITION,
        isCompact ? "max-lg:gap-1 gap-6" : "gap-6 max-lg:gap-4",
      )}
    >
      <div className="shrink-0 max-lg:overflow-visible">
        <EntityPageCompactHeader
          entityLabel={pageLabel}
          canConfigureView={canConfigureView}
          canCreate={permissions.canCreate}
          designLayoutLabel={t("entity.openDesignLayout")}
          createLabel={t("entity.create")}
          onOpenDesignLayout={() =>
            navigate(designLayoutCustomViewPath("main", viewId))
          }
          onCreate={openCreateFormModal}
        />
      </div>

      {mainPageLayout ? (
        <EntityMainPageShell
          layout={mainPageLayout}
          context={mainPageContext}
        />
      ) : (
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            ENTITY_PAGE_CHROME_TRANSITION,
            isCompact ? "max-lg:gap-1 gap-6" : "gap-6 max-lg:gap-4",
          )}
        >
          {legacyMainBody}
        </div>
      )}

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
