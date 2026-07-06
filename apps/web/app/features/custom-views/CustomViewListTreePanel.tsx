import { useCallback, useMemo, useRef, useState } from "react";
import { ExternalLink, LayoutGrid, Plus } from "lucide-react";
import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  IconButton,
  SearchField,
  Select,
  Text,
  toast,
  useFilterPanelDismiss,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { CustomViewsCatalogEnvelope } from "@repo/custom-views/browser";

import { IndexEnvironmentBlockedNotice } from "../../components/index-provisioning/IndexEnvironmentBlockedNotice";
import { useJsonActionTriggerLabels } from "../../components/json/json-action-trigger-labels";
import { useTenantIndexReadiness } from "../../hooks/useTenantIndexReadiness";
import {
  isApiClientError,
  listEntityQueryDefinitions,
  putCustomViewsCatalog,
} from "../../lib/api-client";
import { designLayoutCustomViewPath } from "../../routing/design-layout-nav";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { CustomViewListBadge } from "./components/CustomViewListBadge";
import { CustomViewStatusSummary } from "./components/CustomViewStatusSummary";
import { useCustomViews } from "./custom-views-context";
import {
  CUSTOM_VIEW_LIST_ROW_HOVER_CLASS,
  CUSTOM_VIEW_LIST_ROW_SELECTED_CLASS,
  CUSTOM_VIEW_STATUS_FILTERS,
  type CustomViewListSort,
  type CustomViewStatusFilter,
} from "./custom-view-list-styles";
import { CustomViewMetadataModal } from "./CustomViewMetadataModal";
import { customViewsCatalogJsonLabels } from "./json/custom-view-definition-json-labels";
import { CustomViewsCatalogJsonImportDialog } from "./json/CustomViewsCatalogJsonImportDialog";
import { CustomViewsCatalogJsonViewDialog } from "./json/CustomViewsCatalogJsonViewDialog";
import { useCustomViewsListQuery } from "./use-custom-views-list-query";

export function CustomViewListTreePanel() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { editor, canCreate, canUpdate, canDelete } = useCustomViews();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { isEnvironmentReady, buildingCollections } = useTenantIndexReadiness();

  const queriesQuery = useQuery({
    queryKey: ["entity-query-definitions", "custom-views-list"],
    queryFn: async () => {
      const result = await listEntityQueryDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
  });

  const queries = useMemo(() => queriesQuery.data ?? [], [queriesQuery.data]);
  const queryNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const query of queries) {
      map[query.id] = query.name;
    }
    return map;
  }, [queries]);

  const {
    query,
    listViews,
    filteredViews,
    availableEntities,
    statusCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleEntity,
    clearFilters,
  } = useCustomViewsListQuery(editor.views, queryNameById);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const catalogLabels = customViewsCatalogJsonLabels(t);
  const triggerLabels = useJsonActionTriggerLabels();
  const canReplaceCatalog = canCreate && canUpdate && canDelete;

  const displayBadges = useMemo(
    () =>
      activeFilterBadges.map((badge) => {
        if (badge.id === "search") {
          return badge;
        }
        if (badge.id === "sort") {
          const sortLabel =
            query.sort === "nameDesc"
              ? t("customViews.list.sortNameDesc")
              : query.sort === "entity"
                ? t("customViews.list.sortEntity")
                : query.sort === "updatedDesc"
                  ? t("customViews.list.sortUpdatedDesc")
                  : t("customViews.list.sortNameAsc");
          return {
            ...badge,
            label: sortLabel,
          };
        }
        if (badge.id.startsWith("status:")) {
          const status = badge.id.slice(
            "status:".length,
          ) as CustomViewStatusFilter;
          return {
            ...badge,
            label:
              status === "ACTIVE"
                ? t("customViews.list.statusActive")
                : t("customViews.list.statusPaused"),
          };
        }
        return badge;
      }),
    [activeFilterBadges, query.sort, t],
  );

  const handleCatalogImport = useCallback(
    async (catalog: CustomViewsCatalogEnvelope) => {
      try {
        await putCustomViewsCatalog(catalog);
        toast.success(catalogLabels.importSuccess);
        await editor.refresh();
      } catch (importError) {
        toast.error(
          isApiClientError(importError)
            ? importError.message
            : catalogLabels.importFailed,
        );
      }
    },
    [catalogLabels.importFailed, catalogLabels.importSuccess, editor],
  );

  const headerJsonActions = (
    <>
      <CustomViewsCatalogJsonViewDialog
        items={editor.views}
        queries={queries}
        labels={catalogLabels}
      />
      {canReplaceCatalog ? (
        <CustomViewsCatalogJsonImportDialog
          existingItems={editor.views}
          canApply={canReplaceCatalog}
          importDisabled={!isEnvironmentReady}
          labels={catalogLabels}
          onApply={(catalog) => void handleCatalogImport(catalog)}
        />
      ) : null}
    </>
  );

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("customViews.list.filterByStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {CUSTOM_VIEW_STATUS_FILTERS.map((status) => (
            <Checkbox
              key={status}
              id={`custom-view-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                <span className="inline-flex items-center gap-2">
                  <CustomViewListBadge status={status} size="compact" />
                </span>
              }
            />
          ))}
        </div>
      </div>

      {availableEntities.length > 0 ? (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("customViews.list.filterByEntity")}
          </Text>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {availableEntities.map((entity) => (
              <Checkbox
                key={entity}
                id={`custom-view-entity-${entity}`}
                checked={query.entities.includes(entity)}
                onChange={() => toggleEntity(entity)}
                label={entity}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  const addRow = (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        CUSTOM_VIEW_LIST_ROW_HOVER_CLASS,
      )}
      onClick={() => setCreateModalOpen(true)}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">{t("customViews.list.add")}</Text>
    </button>
  );

  const emptyMessage =
    editor.views.length === 0
      ? t("customViews.list.emptySource")
      : t("customViews.list.emptyFiltered");

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("customViews.list.title")}
        expandLabel={t("customViews.list.expandPanel")}
        collapseLabel={t("customViews.list.collapsePanel")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={addRow}
        headerActions={headerJsonActions}
        jsonTriggerLabels={triggerLabels}
        scopeSection={
          <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
            {!isEnvironmentReady ? (
              <IndexEnvironmentBlockedNotice
                feature="import"
                buildingCollections={buildingCollections}
              />
            ) : null}

            <div className="w-full py-0.5">
              <SearchField
                value={query.search}
                onChange={setSearch}
                placeholder={t("customViews.list.searchPlaceholder")}
                ariaLabel={t("customViews.list.searchPlaceholder")}
                clearAriaLabel={t("customViews.list.searchClear")}
                className="max-w-none min-w-0 w-full"
              />
            </div>

            <div
              ref={toolbarRef}
              className={`w-full min-w-0 ${filtersOpen ? "relative isolate z-30" : ""}`}
            >
              <div className="flex w-full min-w-0 flex-nowrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <FilterPanel
                    open={filtersOpen}
                    onOpenChange={setFiltersOpen}
                    activeBadges={displayBadges}
                    triggerLabel={t("customViews.list.filter")}
                    clearAllLabel={t("customViews.list.clearFilters")}
                    removeAriaLabel={(label) =>
                      t("customViews.list.removeBadge", { label })
                    }
                    onClearAll={clearFilters}
                    badgesBelowToolbar
                    renderBody={false}
                    compact
                    toolbarFillWidth
                    manageDismiss={false}
                    sibling={
                      <div className="w-auto shrink-0 py-0.5">
                        <label className="inline-flex flex-col gap-1">
                          <span className="text-muted-foreground text-xs font-medium">
                            {t("customViews.list.sort")}
                          </span>
                          <Select
                            selectSize="sm"
                            className="w-auto min-w-[9rem]"
                            value={query.sort}
                            onChange={(event) =>
                              setSort(event.target.value as CustomViewListSort)
                            }
                            aria-label={t("customViews.list.sort")}
                          >
                            <option value="nameAsc">
                              {t("customViews.list.sortNameAsc")}
                            </option>
                            <option value="nameDesc">
                              {t("customViews.list.sortNameDesc")}
                            </option>
                            <option value="entity">
                              {t("customViews.list.sortEntity")}
                            </option>
                            <option value="updatedDesc">
                              {t("customViews.list.sortUpdatedDesc")}
                            </option>
                          </Select>
                        </label>
                      </div>
                    }
                  >
                    {filterBody}
                  </FilterPanel>
                </div>
              </div>
              <FilterPanelBody
                open={filtersOpen}
                onClearAll={clearFilters}
                clearAllLabel={t("customViews.list.clearFilters")}
                disabled={!hasActiveFilters}
              >
                {filterBody}
              </FilterPanelBody>
            </div>

            <CustomViewStatusSummary
              statusCounts={statusCounts}
              total={filteredViews.length}
            />
          </div>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-1 py-1">
          {addRow}
          {listViews.length === 0 ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {emptyMessage}
            </Text>
          ) : (
            listViews.map((view) => {
              const isSelected = editor.selectedId === view.id;
              const linkedQueryName =
                queryNameById[view.entityQueryDefinitionId];

              return (
                <div
                  key={view.id}
                  role="treeitem"
                  className={cn(
                    "group/node flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-md py-1 pr-1 transition-colors duration-150",
                    isSelected
                      ? CUSTOM_VIEW_LIST_ROW_SELECTED_CLASS
                      : CUSTOM_VIEW_LIST_ROW_HOVER_CLASS,
                  )}
                  onClick={() => editor.setSelectedId(view.id)}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2 px-2">
                    <LayoutGrid
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        view.status === "ACTIVE"
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40",
                      )}
                    />
                    <div className="min-w-0 space-y-1">
                      <Text className="break-words text-sm font-medium">
                        {view.nav.label}
                      </Text>
                      <Text className="text-muted-foreground break-words text-xs">
                        {view.name} · {view.sourceEntity}
                        {linkedQueryName ? ` · ${linkedQueryName}` : ""}
                      </Text>
                      <CustomViewListBadge
                        status={view.status}
                        size="compact"
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/node:opacity-100">
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("customViews.openPage")}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/app/views/${view.viewId}`);
                      }}
                    >
                      <ExternalLink aria-hidden className="size-4" />
                    </IconButton>
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("customViews.designLayout")}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(
                          designLayoutCustomViewPath("main", view.viewId),
                        );
                      }}
                    >
                      <LayoutGrid aria-hidden className="size-4" />
                    </IconButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ItemListDesignerTreePanelShell>

      <CustomViewMetadataModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
