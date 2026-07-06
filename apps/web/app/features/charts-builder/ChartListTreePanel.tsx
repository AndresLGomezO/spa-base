import { useRef, useState } from "react";
import { LineChart, Plus } from "lucide-react";
import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  SearchField,
  Select,
  Text,
  useFilterPanelDismiss,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";

import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell.js";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes.js";
import {
  CHART_DATA_SOURCE_FILTERS,
  CHART_DISPLAY_MODE_FILTERS,
  CHART_STATUS_FILTERS,
  CHART_TYPE_FILTERS,
  CHART_LIST_ROW_HOVER_CLASS,
  CHART_LIST_ROW_SELECTED_CLASS,
  chartSortLabelKey,
  type ChartDataSourceFilter,
  type ChartDisplayModeFilter,
  type ChartListSort,
  type ChartStatusFilter,
  type ChartTypeFilter,
} from "./chart-list-styles.js";
import { ChartMetadataModal } from "./ChartMetadataModal.js";
import { useCharts } from "./charts-context.js";
import { useChartsListQuery } from "./use-charts-list-query.js";

export function ChartListTreePanel() {
  const { t } = useTranslation("common");
  const { editor, canCreate } = useCharts();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const {
    query,
    listDefinitions,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleDataSource,
    toggleChartType,
    toggleDisplayMode,
    toggleStatus,
    clearFilters,
    chartDataSourceLabelKey,
    chartTypeLabelKey,
    chartDisplayModeLabelKey,
    chartStatusLabelKey,
  } = useChartsListQuery(editor.definitions);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const displayBadges = activeFilterBadges.map((badge) => {
    if (badge.id === "search") {
      return badge;
    }
    if (badge.id === "sort") {
      return { ...badge, label: t(chartSortLabelKey(query.sort)) };
    }
    if (badge.id.startsWith("dataSource:")) {
      const value = badge.id.slice(
        "dataSource:".length,
      ) as ChartDataSourceFilter;
      return { ...badge, label: t(chartDataSourceLabelKey(value)) };
    }
    if (badge.id.startsWith("chartType:")) {
      const value = badge.id.slice("chartType:".length) as ChartTypeFilter;
      return { ...badge, label: t(chartTypeLabelKey(value)) };
    }
    if (badge.id.startsWith("displayMode:")) {
      const value = badge.id.slice(
        "displayMode:".length,
      ) as ChartDisplayModeFilter;
      return { ...badge, label: t(chartDisplayModeLabelKey(value)) };
    }
    if (badge.id.startsWith("status:")) {
      const value = badge.id.slice("status:".length) as ChartStatusFilter;
      return { ...badge, label: t(chartStatusLabelKey(value)) };
    }
    return badge;
  });

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("charts.workbench.list.filterByDataSource")}
        </Text>
        <div className="flex flex-col gap-2">
          {CHART_DATA_SOURCE_FILTERS.map((dataSource) => (
            <Checkbox
              key={dataSource}
              id={`chart-data-source-${dataSource}`}
              checked={query.dataSources.includes(dataSource)}
              onChange={() => toggleDataSource(dataSource)}
              label={t(chartDataSourceLabelKey(dataSource))}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("charts.workbench.list.filterByChartType")}
        </Text>
        <div className="flex flex-col gap-2">
          {CHART_TYPE_FILTERS.map((chartType) => (
            <Checkbox
              key={chartType}
              id={`chart-type-${chartType}`}
              checked={query.chartTypes.includes(chartType)}
              onChange={() => toggleChartType(chartType)}
              label={t(chartTypeLabelKey(chartType))}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("charts.workbench.list.filterByDisplayMode")}
        </Text>
        <div className="flex flex-col gap-2">
          {CHART_DISPLAY_MODE_FILTERS.map((displayMode) => (
            <Checkbox
              key={displayMode}
              id={`chart-display-mode-${displayMode}`}
              checked={query.displayModes.includes(displayMode)}
              onChange={() => toggleDisplayMode(displayMode)}
              label={t(chartDisplayModeLabelKey(displayMode))}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("charts.workbench.list.filterByStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {CHART_STATUS_FILTERS.map((status) => (
            <Checkbox
              key={status}
              id={`chart-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={t(chartStatusLabelKey(status))}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3 sm:col-span-2">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("charts.workbench.list.sortLabel")}
        </Text>
        <Select
          value={query.sort}
          onChange={(event) => setSort(event.target.value as ChartListSort)}
        >
          <option value="nameAsc">
            {t("charts.workbench.list.sortNameAsc")}
          </option>
          <option value="nameDesc">
            {t("charts.workbench.list.sortNameDesc")}
          </option>
          <option value="updatedDesc">
            {t("charts.workbench.list.sortUpdatedDesc")}
          </option>
          <option value="dataSource">
            {t("charts.workbench.list.sortDataSource")}
          </option>
          <option value="chartType">
            {t("charts.workbench.list.sortChartType")}
          </option>
        </Select>
      </div>
    </div>
  );

  const addRow = canCreate ? (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        CHART_LIST_ROW_HOVER_CLASS,
      )}
      onClick={() => setCreateModalOpen(true)}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">
        {t("charts.workbench.createAction")}
      </Text>
    </button>
  ) : null;

  const listContent =
    listDefinitions.length === 0 ? (
      <Text className="text-muted-foreground px-2 py-3 text-sm">
        {t("charts.workbench.list.empty")}
      </Text>
    ) : (
      listDefinitions.map((definition) => {
        const selected = editor.selectedId === definition.id;
        return (
          <button
            key={definition.id}
            type="button"
            className={cn(
              "flex w-full items-start gap-2 rounded-md px-3 py-2 text-left",
              CHART_LIST_ROW_HOVER_CLASS,
              selected ? CHART_LIST_ROW_SELECTED_CLASS : undefined,
            )}
            onClick={() => editor.setSelectedId(definition.id)}
          >
            <LineChart className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <Text className="truncate text-sm font-medium">
                {definition.name}
              </Text>
              <Text className="text-muted-foreground truncate text-xs">
                {definition.dataSource.type} · {definition.chartType}
              </Text>
            </span>
          </button>
        );
      })
    );

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("charts.workbench.list.title")}
        expandLabel={t("charts.workbench.list.title")}
        collapseLabel={t("charts.workbench.list.title")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={addRow}
        scopeSection={
          <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
            <div className="w-full py-0.5">
              <SearchField
                value={query.search}
                onChange={setSearch}
                placeholder={t("charts.workbench.list.searchPlaceholder")}
                ariaLabel={t("charts.workbench.list.searchPlaceholder")}
                clearAriaLabel={t("charts.workbench.list.searchPlaceholder")}
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
                    triggerLabel={t("charts.workbench.list.sortLabel")}
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
                            {t("charts.workbench.list.sortLabel")}
                          </span>
                          <Select
                            selectSize="sm"
                            className="w-auto min-w-[9rem]"
                            value={query.sort}
                            onChange={(event) =>
                              setSort(event.target.value as ChartListSort)
                            }
                            aria-label={t("charts.workbench.list.sortLabel")}
                          >
                            <option value="nameAsc">
                              {t("charts.workbench.list.sortNameAsc")}
                            </option>
                            <option value="nameDesc">
                              {t("charts.workbench.list.sortNameDesc")}
                            </option>
                            <option value="updatedDesc">
                              {t("charts.workbench.list.sortUpdatedDesc")}
                            </option>
                            <option value="dataSource">
                              {t("charts.workbench.list.sortDataSource")}
                            </option>
                            <option value="chartType">
                              {t("charts.workbench.list.sortChartType")}
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
          </div>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-1 py-1">
          {addRow}
          {listContent}
        </div>
      </ItemListDesignerTreePanelShell>

      <ChartMetadataModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
