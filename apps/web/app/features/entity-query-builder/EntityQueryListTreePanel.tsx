import { useCallback, useMemo, useRef, useState } from "react";
import { Pencil, Plus, ScanSearch, Trash2 } from "lucide-react";
import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  IconButton,
  SearchField,
  Text,
  toast,
  useFilterPanelDismiss,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";
import type { EntityQueryDefinitionsCatalogEnvelope } from "@repo/entity-queries/browser";

import {
  isApiClientError,
  putEntityQueryDefinitionsCatalog,
} from "../../lib/api-client";
import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { EntityQueryMetadataModal } from "./EntityQueryMetadataModal";
import { useEntityQueryBuilder } from "./entity-query-builder-context";
import { entityQueryDefinitionsCatalogJsonLabels } from "./json/entity-query-definition-json-labels";
import { useJsonActionTriggerLabels } from "../../components/json/json-action-trigger-labels";
import { EntityQueryDefinitionsCatalogJsonImportDialog } from "./json/EntityQueryDefinitionsCatalogJsonImportDialog";
import { EntityQueryDefinitionsCatalogJsonViewDialog } from "./json/EntityQueryDefinitionsCatalogJsonViewDialog";
import { IndexEnvironmentBlockedNotice } from "../../components/index-provisioning/IndexEnvironmentBlockedNotice";
import { useTenantIndexReadiness } from "../../hooks/useTenantIndexReadiness";
import { EntityQueryListBadge } from "./components/EntityQueryListBadge";
import { EntityQueryStatusSummary } from "./components/EntityQueryStatusSummary";
import {
  ENTITY_QUERY_LIST_ROW_HOVER_CLASS,
  ENTITY_QUERY_LIST_ROW_SELECTED_CLASS,
  ENTITY_QUERY_MODE_FILTERS,
  ENTITY_QUERY_STATUS_FILTERS,
  type EntityQueryListSort,
  type EntityQueryModeFilter,
  type EntityQueryStatusFilter,
} from "./entity-query-list-styles";
import { useEntityQueriesListQuery } from "./use-entity-queries-list-query";

export function EntityQueryListTreePanel() {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const {
    editor,
    canUpdate,
    canCreate,
    canDelete,
    requestMetadataEdit,
    requestDelete,
  } = useEntityQueryBuilder();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const catalogLabels = useMemo(
    () => entityQueryDefinitionsCatalogJsonLabels(t),
    [t],
  );
  const triggerLabels = useJsonActionTriggerLabels();
  const canReplaceCatalog = canCreate && canUpdate && canDelete;
  const { isEnvironmentReady, buildingCollections } = useTenantIndexReadiness();

  const {
    query,
    listDefinitions,
    filteredDefinitions,
    entityOptions,
    statusCounts,
    queryModeCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleQueryMode,
    toggleEntity,
    clearFilters,
    entityQueryModeLabelKey,
    entityQuerySortLabelKey,
    entityQueryStatusLabelKey,
  } = useEntityQueriesListQuery(editor.definitions);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const displayBadges = useMemo(
    () =>
      activeFilterBadges.map((badge) => {
        if (badge.id === "search") {
          return badge;
        }
        if (badge.id === "sort") {
          return {
            ...badge,
            label: t(entityQuerySortLabelKey(query.sort)),
          };
        }
        if (badge.id.startsWith("status:")) {
          const status = badge.id.slice(
            "status:".length,
          ) as EntityQueryStatusFilter;
          return {
            ...badge,
            label: t(entityQueryStatusLabelKey(status)),
          };
        }
        if (badge.id.startsWith("queryMode:")) {
          const mode = badge.id.slice(
            "queryMode:".length,
          ) as EntityQueryModeFilter;
          return {
            ...badge,
            label: t(entityQueryModeLabelKey(mode)),
          };
        }
        if (badge.id.startsWith("entity:")) {
          const entityName = badge.id.slice("entity:".length);
          const entity = entities.find((entry) => entry.name === entityName);
          return {
            ...badge,
            label: entity ? getEntityLabel(entity) : entityName,
          };
        }
        return badge;
      }),
    [
      activeFilterBadges,
      entities,
      entityQueryModeLabelKey,
      entityQuerySortLabelKey,
      entityQueryStatusLabelKey,
      query.sort,
      t,
    ],
  );

  const handleCatalogImport = useCallback(
    async (catalog: EntityQueryDefinitionsCatalogEnvelope) => {
      try {
        await putEntityQueryDefinitionsCatalog(catalog);
        toast.success(catalogLabels.importSuccess);
        await editor.reloadDefinitions();
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

  const handleOpenCreate = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const addRow = (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        ENTITY_QUERY_LIST_ROW_HOVER_CLASS,
      )}
      onClick={handleOpenCreate}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">{t("queryBuilder.list.add")}</Text>
    </button>
  );

  const headerJsonActions = (
    <>
      <EntityQueryDefinitionsCatalogJsonViewDialog
        items={editor.definitions}
        labels={catalogLabels}
        triggerLabels={triggerLabels}
      />
      <EntityQueryDefinitionsCatalogJsonImportDialog
        existingItems={editor.definitions}
        canApply={canReplaceCatalog}
        importDisabled={!isEnvironmentReady}
        labels={catalogLabels}
        triggerLabels={triggerLabels}
        onApply={(catalog) => void handleCatalogImport(catalog)}
      />
    </>
  );

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("queryBuilder.list.filterByStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {ENTITY_QUERY_STATUS_FILTERS.map((status) => (
            <Checkbox
              key={status}
              id={`entity-query-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                <span className="inline-flex items-center gap-2">
                  <EntityQueryListBadge
                    kind="status"
                    value={status}
                    size="compact"
                  />
                </span>
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("queryBuilder.list.filterByQueryMode")}
        </Text>
        <div className="flex flex-col gap-2">
          {ENTITY_QUERY_MODE_FILTERS.map((mode) => (
            <Checkbox
              key={mode}
              id={`entity-query-mode-${mode}`}
              checked={query.queryModes.includes(mode)}
              onChange={() => toggleQueryMode(mode)}
              label={
                <span className="inline-flex items-center gap-2">
                  <EntityQueryListBadge
                    kind="queryMode"
                    value={mode}
                    size="compact"
                  />
                </span>
              }
            />
          ))}
        </div>
      </div>

      {entityOptions.length > 0 ? (
        <div className="space-y-3 sm:col-span-2">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("queryBuilder.list.filterByEntity")}
          </Text>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {entityOptions.map((entityName) => {
              const entity = entities.find(
                (entry) => entry.name === entityName,
              );
              const label = entity ? getEntityLabel(entity) : entityName;

              return (
                <Checkbox
                  key={entityName}
                  id={`entity-query-entity-${entityName}`}
                  checked={query.entities.includes(entityName)}
                  onChange={() => toggleEntity(entityName)}
                  label={label}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );

  const indexNoticeSection = !isEnvironmentReady ? (
    <IndexEnvironmentBlockedNotice
      feature="import"
      buildingCollections={buildingCollections}
    />
  ) : null;

  const emptyMessage =
    editor.definitions.length === 0
      ? t("queryBuilder.list.empty")
      : t("queryBuilder.list.emptyFiltered");

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("queryBuilder.list.title")}
        expandLabel={t("queryBuilder.list.expandPanel")}
        collapseLabel={t("queryBuilder.list.collapsePanel")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={addRow}
        headerActions={headerJsonActions}
        jsonTriggerLabels={triggerLabels}
        scopeSection={
          <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
            <div className="w-full py-0.5">
              <SearchField
                value={query.search}
                onChange={setSearch}
                placeholder={t("queryBuilder.list.searchPlaceholder")}
                ariaLabel={t("queryBuilder.list.searchPlaceholder")}
                clearAriaLabel={t("queryBuilder.list.searchClear")}
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
                    triggerLabel={t("queryBuilder.list.filter")}
                    clearAllLabel={t("queryBuilder.list.clearFilters")}
                    removeAriaLabel={(label) =>
                      t("queryBuilder.list.removeBadge", { label })
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
                            {t("queryBuilder.list.sort")}
                          </span>
                          <Select
                            selectSize="sm"
                            className="w-auto min-w-[9rem]"
                            value={query.sort}
                            onChange={(event) =>
                              setSort(event.target.value as EntityQueryListSort)
                            }
                            aria-label={t("queryBuilder.list.sort")}
                          >
                            <option value="nameAsc">
                              {t("queryBuilder.list.sortNameAsc")}
                            </option>
                            <option value="nameDesc">
                              {t("queryBuilder.list.sortNameDesc")}
                            </option>
                            <option value="sourceEntity">
                              {t("queryBuilder.list.sortSourceEntity")}
                            </option>
                            <option value="queryMode">
                              {t("queryBuilder.list.sortQueryMode")}
                            </option>
                            <option value="updatedDesc">
                              {t("queryBuilder.list.sortUpdatedDesc")}
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
                clearAllLabel={t("queryBuilder.list.clearFilters")}
                disabled={!hasActiveFilters}
              >
                {filterBody}
              </FilterPanelBody>
            </div>

            <EntityQueryStatusSummary
              statusCounts={statusCounts}
              queryModeCounts={queryModeCounts}
              total={filteredDefinitions.length}
            />

            {indexNoticeSection}
          </div>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-1 py-1">
          {addRow}
          {listDefinitions.length === 0 ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {emptyMessage}
            </Text>
          ) : (
            listDefinitions.map((definition) => {
              const entity = entities.find(
                (entry) => entry.name === definition.sourceEntity,
              );
              const entityLabel = entity
                ? getEntityLabel(entity)
                : definition.sourceEntity;
              const isSelected = editor.selectedId === definition.id;
              const queryMode: EntityQueryModeFilter =
                definition.queryMode === "aggregated"
                  ? "aggregated"
                  : "records";

              return (
                <div
                  key={definition.id}
                  role="treeitem"
                  data-tree-node-id={`query-${definition.id}`}
                  className={cn(
                    "group/node flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-md py-1 pr-1 transition-colors duration-150",
                    isSelected
                      ? ENTITY_QUERY_LIST_ROW_SELECTED_CLASS
                      : ENTITY_QUERY_LIST_ROW_HOVER_CLASS,
                  )}
                  onClick={() => editor.setSelectedId(definition.id)}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2 px-2">
                    <ScanSearch
                      aria-hidden
                      className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <Text className="break-words text-sm font-medium">
                        {definition.name}
                      </Text>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <EntityQueryListBadge
                          kind="queryMode"
                          value={queryMode}
                          size="compact"
                        />
                        <EntityQueryListBadge
                          kind="status"
                          value={definition.status}
                          size="compact"
                        />
                        <Text className="text-muted-foreground truncate text-xs">
                          {entityLabel}
                        </Text>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/node:opacity-100">
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("queryBuilder.list.edit")}
                      disabled={!canUpdate}
                      onClick={(event) => {
                        event.stopPropagation();
                        requestMetadataEdit(definition.id);
                      }}
                    >
                      <Pencil aria-hidden className="size-4" />
                    </IconButton>
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("queryBuilder.list.delete")}
                      disabled={!canDelete}
                      onClick={(event) => {
                        event.stopPropagation();
                        requestDelete(definition.id);
                      }}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </IconButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ItemListDesignerTreePanelShell>

      <EntityQueryMetadataModal
        mode="create"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
