import { useCallback, useMemo, useRef, useState } from "react";
import { BarChart3, Plus } from "lucide-react";
import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  SearchField,
  Select,
  Text,
  toast,
  useFilterPanelDismiss,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";
import type { MetricDefinitionsCatalogEnvelope } from "@repo/metrics-engine/browser";

import {
  isApiClientError,
  putMetricDefinitionsCatalog,
} from "../../lib/api-client";
import { MetricDefinitionsCatalogJsonImportDialog } from "../../components/metrics/json/MetricDefinitionsCatalogJsonImportDialog";
import { MetricDefinitionsCatalogJsonViewDialog } from "../../components/metrics/json/MetricDefinitionsCatalogJsonViewDialog";
import { metricDefinitionsCatalogJsonLabels } from "../../components/metrics/json/metric-definition-json-labels";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { MetricListBadge } from "./components/MetricListBadge";
import { MetricStatusSummary } from "./components/MetricStatusSummary";
import {
  METRIC_LIST_ROW_HOVER_CLASS,
  METRIC_LIST_ROW_SELECTED_CLASS,
  METRIC_MODE_FILTERS,
  METRIC_SOURCE_TYPE_FILTERS,
  METRIC_STATUS_FILTERS,
  metricSortLabelKey,
  type MetricListSort,
  type MetricModeFilter,
  type MetricSourceTypeFilter,
  type MetricStatusFilter,
} from "./metric-list-styles";
import { MetricMetadataModal } from "./MetricMetadataModal";
import { useMetrics } from "./metrics-context";
import { useMetricsListQuery } from "./use-metrics-list-query";

export function MetricListTreePanel() {
  const { t } = useTranslation("common");
  const { editor, canCreate, canUpdate, canBackfill } = useMetrics();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const {
    query,
    listDefinitions,
    filteredDefinitions,
    entityOptions,
    modeCounts,
    statusCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleSourceType,
    toggleMode,
    toggleStatus,
    toggleEntity,
    clearFilters,
    metricSourceTypeLabelKey,
    metricModeLabelKey,
    metricStatusLabelKey,
  } = useMetricsListQuery(editor.definitions);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const catalogLabels = useMemo(
    () => metricDefinitionsCatalogJsonLabels(t),
    [t],
  );
  const canReplaceCatalog = canCreate && canUpdate && canBackfill;

  const displayBadges = useMemo(
    () =>
      activeFilterBadges.map((badge) => {
        if (badge.id === "search") {
          return badge;
        }
        if (badge.id === "sort") {
          return {
            ...badge,
            label: t(metricSortLabelKey(query.sort)),
          };
        }
        if (badge.id.startsWith("sourceType:")) {
          const sourceType = badge.id.slice(
            "sourceType:".length,
          ) as MetricSourceTypeFilter;
          return {
            ...badge,
            label: t(metricSourceTypeLabelKey(sourceType)),
          };
        }
        if (badge.id.startsWith("mode:")) {
          const mode = badge.id.slice("mode:".length) as MetricModeFilter;
          return {
            ...badge,
            label: t(metricModeLabelKey(mode)),
          };
        }
        if (badge.id.startsWith("status:")) {
          const status = badge.id.slice("status:".length) as MetricStatusFilter;
          return {
            ...badge,
            label: t(metricStatusLabelKey(status)),
          };
        }
        return badge;
      }),
    [
      activeFilterBadges,
      metricModeLabelKey,
      metricSourceTypeLabelKey,
      metricStatusLabelKey,
      query.sort,
      t,
    ],
  );

  const handleCatalogImport = useCallback(
    async (catalog: MetricDefinitionsCatalogEnvelope) => {
      try {
        await putMetricDefinitionsCatalog(catalog);
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

  const catalogActions = (
    <div className="flex flex-wrap items-center gap-2">
      <MetricDefinitionsCatalogJsonViewDialog
        items={editor.definitions}
        labels={catalogLabels}
      />
      {canReplaceCatalog ? (
        <MetricDefinitionsCatalogJsonImportDialog
          existingItems={editor.definitions}
          canApply={canReplaceCatalog}
          labels={catalogLabels}
          onApply={(catalog) => void handleCatalogImport(catalog)}
        />
      ) : null}
    </div>
  );

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("metrics.workbench.list.filterBySourceType")}
        </Text>
        <div className="flex flex-col gap-2">
          {METRIC_SOURCE_TYPE_FILTERS.map((sourceType) => (
            <Checkbox
              key={sourceType}
              id={`metric-source-type-${sourceType}`}
              checked={query.sourceTypes.includes(sourceType)}
              onChange={() => toggleSourceType(sourceType)}
              label={
                <span className="inline-flex items-center gap-2">
                  <MetricListBadge
                    kind="sourceType"
                    value={sourceType}
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
          {t("metrics.workbench.list.filterByMode")}
        </Text>
        <div className="flex flex-col gap-2">
          {METRIC_MODE_FILTERS.map((mode) => (
            <Checkbox
              key={mode}
              id={`metric-mode-${mode}`}
              checked={query.modes.includes(mode)}
              onChange={() => toggleMode(mode)}
              label={
                <span className="inline-flex items-center gap-2">
                  <MetricListBadge kind="mode" value={mode} size="compact" />
                </span>
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("metrics.workbench.list.filterByStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {METRIC_STATUS_FILTERS.map((status) => (
            <Checkbox
              key={status}
              id={`metric-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                <span className="inline-flex items-center gap-2">
                  <MetricListBadge
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

      {entityOptions.length > 0 ? (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("metrics.workbench.list.filterByEntity")}
          </Text>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {entityOptions.map((entity) => (
              <Checkbox
                key={entity}
                id={`metric-entity-${entity}`}
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
        METRIC_LIST_ROW_HOVER_CLASS,
      )}
      onClick={() => setCreateModalOpen(true)}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">
        {t("metrics.workbench.list.add")}
      </Text>
    </button>
  );

  const emptyMessage =
    editor.definitions.length === 0
      ? t("metrics.workbench.list.emptySource")
      : t("metrics.workbench.list.emptyFiltered");

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("metrics.workbench.list.title")}
        expandLabel={t("metrics.workbench.list.expandPanel")}
        collapseLabel={t("metrics.workbench.list.collapsePanel")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={addRow}
        scopeSection={
          <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
            <div className="w-full py-0.5">
              <SearchField
                value={query.search}
                onChange={setSearch}
                placeholder={t("metrics.workbench.list.searchPlaceholder")}
                ariaLabel={t("metrics.workbench.list.searchPlaceholder")}
                clearAriaLabel={t("metrics.workbench.list.searchClear")}
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
                    triggerLabel={t("metrics.workbench.list.filter")}
                    clearAllLabel={t("metrics.workbench.list.clearFilters")}
                    removeAriaLabel={(label) =>
                      t("metrics.workbench.list.removeBadge", { label })
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
                            {t("metrics.workbench.list.sort")}
                          </span>
                          <Select
                            selectSize="sm"
                            className="w-auto min-w-[9rem]"
                            value={query.sort}
                            onChange={(event) =>
                              setSort(event.target.value as MetricListSort)
                            }
                            aria-label={t("metrics.workbench.list.sort")}
                          >
                            <option value="nameAsc">
                              {t("metrics.workbench.list.sortNameAsc")}
                            </option>
                            <option value="nameDesc">
                              {t("metrics.workbench.list.sortNameDesc")}
                            </option>
                            <option value="sourceModel">
                              {t("metrics.workbench.list.sortSourceModel")}
                            </option>
                            <option value="mode">
                              {t("metrics.workbench.list.sortMode")}
                            </option>
                            <option value="updatedDesc">
                              {t("metrics.workbench.list.sortUpdatedDesc")}
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
                clearAllLabel={t("metrics.workbench.list.clearFilters")}
                disabled={!hasActiveFilters}
              >
                {filterBody}
              </FilterPanelBody>
            </div>

            <MetricStatusSummary
              modeCounts={modeCounts}
              statusCounts={statusCounts}
              total={filteredDefinitions.length}
            />

            {catalogActions}
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
              const isSelected = editor.selectedId === definition.id;
              const mode: MetricModeFilter =
                definition.computationMode === "computed"
                  ? "computed"
                  : "aggregated";
              const sourceType: MetricSourceTypeFilter =
                definition.sourceQueryDefinitionId ? "query" : "entity";

              return (
                <div
                  key={definition.id}
                  role="treeitem"
                  className={cn(
                    "group/node flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-md py-1 pr-1 transition-colors duration-150",
                    isSelected
                      ? METRIC_LIST_ROW_SELECTED_CLASS
                      : METRIC_LIST_ROW_HOVER_CLASS,
                  )}
                  onClick={() => editor.setSelectedId(definition.id)}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2 px-2">
                    <BarChart3
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        definition.status === "ACTIVE"
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40",
                      )}
                    />
                    <div className="min-w-0 space-y-1">
                      <Text className="break-words text-sm font-medium">
                        {definition.name}
                      </Text>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <MetricListBadge
                          kind="mode"
                          value={mode}
                          size="compact"
                        />
                        <MetricListBadge
                          kind="sourceType"
                          value={sourceType}
                          size="compact"
                        />
                        <MetricListBadge
                          kind="status"
                          value={definition.status}
                          size="compact"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ItemListDesignerTreePanelShell>

      <MetricMetadataModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
