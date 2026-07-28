import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  SearchField,
  Text,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { cn } from "@repo/theme/utils";
import { BookOpen, LayoutDashboard, RefreshCw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  WorkloadKind,
  WorkloadStatus,
  WorkloadWithState,
} from "../../lib/admin-client";
import { ItemListDesignerTreePanelShell } from "../../features/item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../../features/ui-builder/designer-tree-workbench-classes";
import {
  ALL_WORKLOAD_DOMAINS,
  ALL_WORKLOAD_FREQUENCIES,
  ALL_WORKLOAD_SOURCES,
  ALL_WORKLOAD_STATUSES,
  OPERATIONAL_WORKLOAD_KINDS,
  SCHEDULE_HOUR_PRESETS,
  WORKLOAD_LIST_ROW_HOVER_CLASS,
  WORKLOAD_LIST_ROW_SELECTED_CLASS,
  WORKLOAD_STATUS_ACCENT_CLASS,
  StatusBadge,
  domainLabelKey,
  formatLiveSummary,
  formatWorkloadScheduleSnippet,
  frequencyLabelKey,
  kindLabelKey,
  type WorkloadListSort,
} from "./workload-ui-shared";

function parseCsvParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toggleCsvValue(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function WorkloadRow({
  workload,
  selected,
  onSelect,
}: {
  readonly workload: WorkloadWithState;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { t } = useTranslation("common");
  const accent = WORKLOAD_STATUS_ACCENT_CLASS[workload.state.status];
  const live = formatLiveSummary(workload.state.live);
  const scheduleSnippet = formatWorkloadScheduleSnippet(workload, t);

  return (
    <div
      role="treeitem"
      aria-selected={selected}
      className={cn(
        "group/node flex w-full min-w-0 cursor-pointer items-start gap-1 rounded-md border-l-2 py-2 pr-1 transition-colors duration-150",
        accent,
        selected
          ? WORKLOAD_LIST_ROW_SELECTED_CLASS
          : WORKLOAD_LIST_ROW_HOVER_CLASS,
      )}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1 px-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="min-w-0 break-words text-sm font-medium">
            {workload.displayName}
          </Text>
          <StatusBadge status={workload.state.status} size="compact" />
        </div>
        <Text className="text-muted-foreground mt-0.5 block text-xs">
          {t(domainLabelKey(workload.domain) as never)} ·{" "}
          {t(kindLabelKey(workload.kind) as never)}
          {scheduleSnippet ? ` · ${scheduleSnippet}` : ""}
          {live !== "—" ? ` · ${live}` : ""}
        </Text>
      </div>
    </div>
  );
}

export function WorkloadListTreePanel({
  workloads,
  selectedId,
  catalogSelected,
  search,
  kinds,
  sources,
  statuses,
  domains,
  frequencies,
  hours,
  sort,
  isRefreshing,
  onSearchChange,
  onKindsChange,
  onSourcesChange,
  onStatusesChange,
  onDomainsChange,
  onFrequenciesChange,
  onHoursChange,
  onSortChange,
  onSelect,
  onClearSelection,
  onOpenCatalog,
  onRefresh,
  onClearFilters,
}: {
  readonly workloads: readonly WorkloadWithState[];
  readonly selectedId: string | null;
  readonly catalogSelected?: boolean;
  readonly search: string;
  readonly kinds: readonly string[];
  readonly sources: readonly string[];
  readonly statuses: readonly string[];
  readonly domains: readonly string[];
  readonly frequencies: readonly string[];
  readonly hours: readonly number[];
  readonly sort: WorkloadListSort;
  readonly isRefreshing?: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onKindsChange: (values: string[]) => void;
  readonly onSourcesChange: (values: string[]) => void;
  readonly onStatusesChange: (values: string[]) => void;
  readonly onDomainsChange: (values: string[]) => void;
  readonly onFrequenciesChange: (values: string[]) => void;
  readonly onHoursChange: (values: number[]) => void;
  readonly onSortChange: (value: WorkloadListSort) => void;
  readonly onSelect: (id: string) => void;
  readonly onClearSelection: () => void;
  readonly onOpenCatalog: () => void;
  readonly onRefresh: () => void;
  readonly onClearFilters: () => void;
}) {
  const { t } = useTranslation("common");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<WorkloadStatus, number> = {
      running: 0,
      scheduled: 0,
      ready: 0,
      paused: 0,
      disabled: 0,
      unknown: 0,
    };
    for (const workload of workloads) {
      counts[workload.state.status] += 1;
    }
    return counts;
  }, [workloads]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    kinds.length > 0 ||
    sources.length > 0 ||
    statuses.length > 0 ||
    domains.length > 0 ||
    frequencies.length > 0 ||
    hours.length > 0;

  const activeBadges = useMemo(() => {
    const badges: Array<{ id: string; label: string; onRemove: () => void }> =
      [];
    if (search.trim()) {
      badges.push({
        id: "q",
        label: search.trim(),
        onRemove: () => onSearchChange(""),
      });
    }
    for (const kind of kinds) {
      badges.push({
        id: `kind:${kind}`,
        label: t(kindLabelKey(kind as WorkloadKind) as never),
        onRemove: () => onKindsChange(toggleCsvValue([...kinds], kind)),
      });
    }
    for (const source of sources) {
      badges.push({
        id: `source:${source}`,
        label: t(
          `platform.workloads.source${source.charAt(0).toUpperCase()}${source.slice(1)}` as never,
        ),
        onRemove: () => onSourcesChange(toggleCsvValue([...sources], source)),
      });
    }
    for (const status of statuses) {
      badges.push({
        id: `status:${status}`,
        label: t(
          `platform.workloads.status${status.charAt(0).toUpperCase()}${status.slice(1)}` as never,
        ),
        onRemove: () => onStatusesChange(toggleCsvValue([...statuses], status)),
      });
    }
    for (const domain of domains) {
      badges.push({
        id: `domain:${domain}`,
        label: t(domainLabelKey(domain as never) as never),
        onRemove: () => onDomainsChange(toggleCsvValue([...domains], domain)),
      });
    }
    for (const frequency of frequencies) {
      badges.push({
        id: `frequency:${frequency}`,
        label: t(frequencyLabelKey(frequency as never) as never),
        onRemove: () =>
          onFrequenciesChange(toggleCsvValue([...frequencies], frequency)),
      });
    }
    for (const hour of hours) {
      badges.push({
        id: `hour:${hour}`,
        label: t("platform.workloads.runAtHour", {
          hour: String(hour).padStart(2, "0"),
        }),
        onRemove: () => onHoursChange(hours.filter((value) => value !== hour)),
      });
    }
    return badges;
  }, [
    search,
    kinds,
    sources,
    statuses,
    domains,
    frequencies,
    hours,
    onSearchChange,
    onKindsChange,
    onSourcesChange,
    onStatusesChange,
    onDomainsChange,
    onFrequenciesChange,
    onHoursChange,
    t,
  ]);

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("platform.workloads.filterDomain")}
        </Text>
        <div className="flex flex-col gap-2">
          {ALL_WORKLOAD_DOMAINS.map((domain) => (
            <Checkbox
              key={domain}
              id={`workload-domain-${domain}`}
              checked={domains.includes(domain)}
              onChange={() =>
                onDomainsChange(toggleCsvValue([...domains], domain))
              }
              label={t(domainLabelKey(domain) as never)}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("platform.workloads.filterFrequency")}
        </Text>
        <div className="flex flex-col gap-2">
          {ALL_WORKLOAD_FREQUENCIES.map((frequency) => (
            <Checkbox
              key={frequency}
              id={`workload-frequency-${frequency}`}
              checked={frequencies.includes(frequency)}
              onChange={() =>
                onFrequenciesChange(toggleCsvValue([...frequencies], frequency))
              }
              label={t(frequencyLabelKey(frequency) as never)}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("platform.workloads.filterRunAt")}
        </Text>
        <Text className="text-muted-foreground text-[11px]">
          {t("platform.workloads.filterRunAtHint")}
        </Text>
        <div className="flex flex-col gap-2">
          {SCHEDULE_HOUR_PRESETS.map((hour) => (
            <Checkbox
              key={hour}
              id={`workload-hour-${hour}`}
              checked={hours.includes(hour)}
              onChange={() =>
                onHoursChange(
                  hours.includes(hour)
                    ? hours.filter((value) => value !== hour)
                    : [...hours, hour].sort((a, b) => a - b),
                )
              }
              label={t("platform.workloads.runAtHour", {
                hour: String(hour).padStart(2, "0"),
              })}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("platform.workloads.filterKind")}
        </Text>
        <div className="flex flex-col gap-2">
          {OPERATIONAL_WORKLOAD_KINDS.map((kind) => (
            <Checkbox
              key={kind}
              id={`workload-kind-${kind}`}
              checked={kinds.includes(kind)}
              onChange={() => onKindsChange(toggleCsvValue([...kinds], kind))}
              label={t(kindLabelKey(kind) as never)}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("platform.workloads.filterSource")}
        </Text>
        <div className="flex flex-col gap-2">
          {ALL_WORKLOAD_SOURCES.map((source) => (
            <Checkbox
              key={source}
              id={`workload-source-${source}`}
              checked={sources.includes(source)}
              onChange={() =>
                onSourcesChange(toggleCsvValue([...sources], source))
              }
              label={t(
                `platform.workloads.source${source.charAt(0).toUpperCase()}${source.slice(1)}` as never,
              )}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("platform.workloads.filterStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {ALL_WORKLOAD_STATUSES.map((status) => (
            <Checkbox
              key={status}
              id={`workload-status-${status}`}
              checked={statuses.includes(status)}
              onChange={() =>
                onStatusesChange(toggleCsvValue([...statuses], status))
              }
              label={t(
                `platform.workloads.status${status.charAt(0).toUpperCase()}${status.slice(1)}` as never,
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const overviewSelected = selectedId == null && !catalogSelected;

  const overviewRow = (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        overviewSelected
          ? WORKLOAD_LIST_ROW_SELECTED_CLASS
          : WORKLOAD_LIST_ROW_HOVER_CLASS,
      )}
      onClick={onClearSelection}
    >
      <LayoutDashboard
        aria-hidden
        className="text-muted-foreground size-4 shrink-0"
      />
      <Text className="text-sm font-medium">
        {t("platform.workloads.overviewRow")}
      </Text>
    </button>
  );

  const catalogRow = (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        catalogSelected
          ? WORKLOAD_LIST_ROW_SELECTED_CLASS
          : WORKLOAD_LIST_ROW_HOVER_CLASS,
      )}
      onClick={onOpenCatalog}
    >
      <BookOpen aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">
        {t("platform.workloads.catalogRow")}
      </Text>
    </button>
  );

  const refreshRow = (
    <button
      type="button"
      className={cn(
        "text-muted-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
        WORKLOAD_LIST_ROW_HOVER_CLASS,
      )}
      onClick={onRefresh}
      disabled={isRefreshing}
    >
      <RefreshCw
        aria-hidden
        className={cn("size-3.5 shrink-0", isRefreshing && "animate-spin")}
      />
      {t("platform.workloads.refresh")}
    </button>
  );

  const scopeSection = (
    <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
      <div className="w-full py-0.5">
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder={t("platform.workloads.searchPlaceholder")}
          ariaLabel={t("platform.workloads.searchPlaceholder")}
          clearAriaLabel={t("platform.workloads.searchClear")}
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
              activeBadges={activeBadges}
              triggerLabel={t("platform.workloads.filter")}
              clearAllLabel={t("platform.workloads.clearFilters")}
              removeAriaLabel={(label) =>
                t("platform.workloads.removeBadge", { label })
              }
              onClearAll={onClearFilters}
              badgesBelowToolbar
              renderBody={false}
              compact
              toolbarFillWidth
              manageDismiss={false}
              sibling={
                <div className="w-auto shrink-0 py-0.5">
                  <label className="inline-flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium">
                      {t("platform.workloads.sort")}
                    </span>
                    <Select
                      selectSize="sm"
                      className="w-auto min-w-[9rem]"
                      value={sort}
                      onChange={(event) =>
                        onSortChange(event.target.value as WorkloadListSort)
                      }
                      aria-label={t("platform.workloads.sort")}
                    >
                      <option value="name">
                        {t("platform.workloads.sortName")}
                      </option>
                      <option value="kind">
                        {t("platform.workloads.sortKind")}
                      </option>
                      <option value="status">
                        {t("platform.workloads.sortStatus")}
                      </option>
                      <option value="newest">
                        {t("platform.workloads.sortNewest")}
                      </option>
                      <option value="scheduleTime">
                        {t("platform.workloads.sortScheduleTime")}
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
          onClearAll={onClearFilters}
          clearAllLabel={t("platform.workloads.clearFilters")}
          disabled={!hasActiveFilters}
        >
          {filterBody}
        </FilterPanelBody>
      </div>

      <div className="flex flex-wrap gap-1.5 px-0.5">
        {ALL_WORKLOAD_STATUSES.map((status) => (
          <span
            key={status}
            className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
          >
            <StatusBadge status={status} size="compact" />
            {statusCounts[status]}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <ItemListDesignerTreePanelShell
      title={t("platform.workloads.title")}
      expandLabel={t("platform.workloads.expandPanel")}
      collapseLabel={t("platform.workloads.collapsePanel")}
      expandedClassName={cn(
        designerTreePanelShellClassName,
        "w-full max-w-[400px]",
      )}
      collapsedClassName={designerTreePanelShellClassName}
      expandedBodyClassName="w-full min-w-0 overflow-x-hidden"
      collapsedContent={refreshRow}
      scopeSection={scopeSection}
    >
      <div className="relative flex w-full min-w-0 flex-col gap-2 py-1">
        {overviewRow}
        {catalogRow}
        {refreshRow}
        {workloads.length === 0 ? (
          <Text className="text-muted-foreground px-2 py-3 text-sm">
            {hasActiveFilters
              ? t("platform.workloads.emptyFiltered")
              : t("platform.workloads.empty")}
          </Text>
        ) : (
          <ul className="space-y-2.5 px-1" role="tree">
            {workloads.map((workload) => (
              <li key={workload.id}>
                <WorkloadRow
                  workload={workload}
                  selected={selectedId === workload.id}
                  onSelect={() => onSelect(workload.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </ItemListDesignerTreePanelShell>
  );
}

export { parseCsvParam };
