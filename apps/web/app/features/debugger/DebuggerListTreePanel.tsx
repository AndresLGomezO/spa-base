import {
  Button,
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  IconButton,
  Input,
  SearchField,
  Text,
  toast,
  useFilterPanelDismiss,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { cn } from "@repo/theme/utils";
import { Clipboard, LayoutDashboard, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { DebugEvent, DebugEventStatus } from "../../lib/api-client";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { DebuggerHookLiveStatus } from "./components/DebuggerHookLiveStatus";
import {
  DebuggerLastUpdatedLabel,
  DebuggerRefreshRow,
  DebuggerRefreshingOverlay,
} from "./components/DebuggerRefreshControls";
import { DebuggerJsonViewDialog } from "./components/DebuggerJsonViewDialog";
import {
  IndexProvisioningTreeJobs,
  IndexProvisioningTreeScope,
} from "./components/IndexProvisioningTreePanel";
import { DebuggerStatusBadge } from "./components/DebuggerStatusBadge";
import { DebuggerResolutionBadge } from "./components/DebuggerResolutionBadge";
import { DebuggerStatusSummary } from "./components/DebuggerStatusSummary";
import { DebuggerTimeRangeControl } from "./components/DebuggerTimeRangeControl";
import { useDebugger } from "./debugger-context";
import { DEBUGGER_PAGE_SIZE_OPTIONS } from "./debugger-page-size";
import { debuggerSourceLabelKey } from "./debugger-source-config";
import {
  DEBUGGER_LIST_ROW_HOVER_CLASS,
  DEBUGGER_LIST_ROW_SELECTED_CLASS,
  DEBUGGER_STATUS_ACCENT_CLASS,
  type DebuggerListSort,
} from "./debugger-status-styles";
import { buildDebugRecordKey } from "./dismissed-debug-records";
import {
  hookResolutionSourceLabelKey,
  resolutionSourceForEvent,
  type HookResolutionSourceKey,
} from "./hook-resolution-source";
import { type HookExecutionTypeKey } from "./hook-execution-live-metrics";
import {
  parsePositiveInt,
  useDebuggerListQuery,
} from "./use-debugger-list-query";
import type { AiJobFeatureKey } from "./ai-job-features";

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function sortLabelKey(
  sort: DebuggerListSort,
): `debugger.list.sort${"Newest" | "Oldest" | "Status" | "Title"}` {
  switch (sort) {
    case "oldest":
      return "debugger.list.sortOldest";
    case "status":
      return "debugger.list.sortStatus";
    case "title":
      return "debugger.list.sortTitle";
    case "newest":
    default:
      return "debugger.list.sortNewest";
  }
}

function DebuggerRecordRow({ event }: { readonly event: DebugEvent }) {
  const { t } = useTranslation("common");
  const { selectedRecordKey, selectRecord, dismissRecord } = useDebugger();
  const recordKey = buildDebugRecordKey(event.source, event.id);
  const isSelected =
    selectedRecordKey === recordKey || selectedRecordKey === event.id;
  const accentClass = event.status
    ? (DEBUGGER_STATUS_ACCENT_CLASS[event.status] ?? "")
    : "";

  return (
    <div
      role="treeitem"
      className={cn(
        "group/node flex w-full min-w-0 cursor-pointer items-start gap-1 rounded-md border-l-2 py-2 pr-1 transition-colors duration-150",
        accentClass.length > 0 ? accentClass : "border-l-transparent",
        isSelected
          ? DEBUGGER_LIST_ROW_SELECTED_CLASS
          : DEBUGGER_LIST_ROW_HOVER_CLASS,
      )}
      onClick={() => selectRecord(event)}
    >
      <div className="min-w-0 flex-1 px-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="min-w-0 break-words text-sm font-medium">
            {event.title}
          </Text>
          {event.status ? (
            <DebuggerStatusBadge status={event.status} size="compact" />
          ) : null}
          {event.source === "hookExecution" ? (
            <DebuggerResolutionBadge
              resolutionSource={resolutionSourceForEvent(event)}
              size="compact"
            />
          ) : null}
          {event.source === "ai" &&
          typeof event.summary?.estimatedCostUsd === "number" ? (
            <Text className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              }).format(event.summary.estimatedCostUsd)}
            </Text>
          ) : null}
        </div>
        <Text className="text-muted-foreground mt-0.5 break-words text-xs">
          {event.subtitle ?? event.timestamp}
          {event.source === "ai" &&
          typeof event.summary?.modelId === "string" ? (
            <> · {event.summary.modelId}</>
          ) : null}
        </Text>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/node:opacity-100">
        <IconButton
          type="button"
          size="sm"
          label={t("debugger.actions.copy")}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            void navigator.clipboard.writeText(formatJson(event));
            toast.success(t("debugger.actions.copied"));
          }}
        >
          <Clipboard aria-hidden className="size-4" />
        </IconButton>
        <IconButton
          type="button"
          size="sm"
          label={t("debugger.actions.dismiss")}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            dismissRecord(event);
          }}
        >
          <Trash2 aria-hidden className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

export function DebuggerListTreePanel() {
  const { t } = useTranslation("common");
  const {
    activeSource,
    sourceEvents,
    isLoading,
    selectedEvent,
    selectedIndexSignature,
    clearSelectedRecord,
    hookExecutionLive,
    hasMoreOlder,
    hasMoreNewer,
    isLoadingOlder,
    isLoadingNewer,
    loadOlder,
    loadNewer,
    pageSize,
    setPageSize,
    timeRangeBounds,
  } = useDebugger();
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const {
    query,
    listEvents,
    statusCounts,
    availableStatuses,
    availableExecutionTypes,
    availableResolutionSources,
    availableAiFeatures,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleShowSkipped,
    toggleExecutionType,
    toggleResolutionSource,
    toggleAiFeature,
    setMinWrites,
    setMinDurationMs,
    clearFilters,
    debuggerStatusLabelKey,
    hookExecutionTypeLabelKey,
    hookResolutionSourceLabelKey,
    aiJobFeatureLabelKey,
  } = useDebuggerListQuery(sourceEvents, activeSource, timeRangeBounds);

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
            label: t(sortLabelKey(query.sort)),
          };
        }
        if (badge.id === "showSkipped") {
          return {
            ...badge,
            label: t("debugger.list.showSkipped"),
          };
        }
        if (badge.id.startsWith("status:")) {
          const status = badge.id.slice("status:".length) as DebugEventStatus;
          return {
            ...badge,
            label: t(debuggerStatusLabelKey(status)),
          };
        }
        if (badge.id.startsWith("executionType:")) {
          const executionType = badge.id.slice(
            "executionType:".length,
          ) as HookExecutionTypeKey;
          return {
            ...badge,
            label: t(hookExecutionTypeLabelKey(executionType)),
          };
        }
        if (badge.id.startsWith("resolutionSource:")) {
          const resolutionSource = badge.id.slice(
            "resolutionSource:".length,
          ) as HookResolutionSourceKey;
          return {
            ...badge,
            label: t(hookResolutionSourceLabelKey(resolutionSource)),
          };
        }
        if (badge.id.startsWith("aiFeature:")) {
          const feature = badge.id.slice(
            "aiFeature:".length,
          ) as AiJobFeatureKey;
          return {
            ...badge,
            label: t(aiJobFeatureLabelKey(feature)),
          };
        }
        if (badge.id === "minWrites") {
          return {
            ...badge,
            label: `${t("debugger.list.minWrites")}: ${badge.label}`,
          };
        }
        if (badge.id === "minDuration") {
          return {
            ...badge,
            label: `${t("debugger.list.minDuration")}: ${badge.label}`,
          };
        }
        return badge;
      }),
    [
      activeFilterBadges,
      aiJobFeatureLabelKey,
      debuggerStatusLabelKey,
      hookExecutionTypeLabelKey,
      hookResolutionSourceLabelKey,
      query.sort,
      t,
    ],
  );

  const overviewRow = (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        selectedEvent == null && !selectedIndexSignature
          ? DEBUGGER_LIST_ROW_SELECTED_CLASS
          : DEBUGGER_LIST_ROW_HOVER_CLASS,
      )}
      onClick={clearSelectedRecord}
    >
      <LayoutDashboard
        aria-hidden
        className="text-muted-foreground size-4 shrink-0"
      />
      <Text className="text-sm font-medium">{t("debugger.summary.title")}</Text>
    </button>
  );

  const refreshRow = <DebuggerRefreshRow />;

  const filterBody = (
    <div
      className={
        activeSource === "hookExecution" || activeSource === "ai"
          ? "grid gap-6 sm:grid-cols-2"
          : "space-y-3"
      }
    >
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("debugger.list.filterByStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {availableStatuses.map((status) => (
            <Checkbox
              key={status}
              id={`debugger-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                <span className="inline-flex items-center gap-2">
                  <DebuggerStatusBadge status={status} size="compact" />
                </span>
              }
            />
          ))}
          {activeSource === "hookExecution" ? (
            <Checkbox
              id="debugger-show-skipped"
              checked={query.showSkipped}
              onChange={toggleShowSkipped}
              label={t("debugger.list.showSkipped")}
            />
          ) : null}
        </div>
      </div>

      {activeSource === "ai" ? (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("debugger.list.filterByFeature")}
          </Text>
          <div className="flex flex-col gap-2">
            {availableAiFeatures.map((feature) => (
              <Checkbox
                key={feature}
                id={`debugger-ai-feature-${feature}`}
                checked={query.aiFeatures.includes(feature)}
                onChange={() => toggleAiFeature(feature)}
                label={t(aiJobFeatureLabelKey(feature))}
              />
            ))}
          </div>
        </div>
      ) : null}

      {activeSource === "hookExecution" ? (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("debugger.list.filterByTypology")}
          </Text>
          <div className="flex flex-col gap-2">
            {availableExecutionTypes.map((executionType) => (
              <Checkbox
                key={executionType}
                id={`debugger-execution-type-${executionType}`}
                checked={query.executionTypes.includes(executionType)}
                onChange={() => toggleExecutionType(executionType)}
                label={t(hookExecutionTypeLabelKey(executionType))}
              />
            ))}
          </div>
          <Text className="text-muted-foreground pt-2 text-xs font-medium">
            {t("debugger.list.filterByResolution")}
          </Text>
          <div className="flex flex-col gap-2">
            {availableResolutionSources.map((resolutionSource) => (
              <Checkbox
                key={resolutionSource}
                id={`debugger-resolution-${resolutionSource}`}
                checked={query.resolutionSources.includes(resolutionSource)}
                onChange={() => toggleResolutionSource(resolutionSource)}
                label={t(hookResolutionSourceLabelKey(resolutionSource))}
              />
            ))}
          </div>
          <div className="grid gap-3 pt-2">
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs font-medium">
                {t("debugger.list.minWrites")}
              </span>
              <Input
                type="number"
                min={0}
                value={query.minWrites > 0 ? String(query.minWrites) : ""}
                onChange={(event) =>
                  setMinWrites(parsePositiveInt(event.target.value))
                }
                placeholder="0"
                className="h-8"
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs font-medium">
                {t("debugger.list.minDuration")}
              </span>
              <Input
                type="number"
                min={0}
                value={
                  query.minDurationMs > 0 ? String(query.minDurationMs) : ""
                }
                onChange={(event) =>
                  setMinDurationMs(parsePositiveInt(event.target.value))
                }
                placeholder="0"
                className="h-8"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );

  const isIndexProvisionSource = activeSource === "indexProvision";

  const emptyMessage =
    sourceEvents.length === 0
      ? t("debugger.list.emptySource")
      : t("debugger.list.emptyFiltered");

  const scopeSection = isIndexProvisionSource ? (
    <IndexProvisioningTreeScope />
  ) : (
    <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
      <div className="w-full py-0.5">
        <SearchField
          value={query.search}
          onChange={setSearch}
          placeholder={t("debugger.list.searchPlaceholder")}
          ariaLabel={t("debugger.list.searchPlaceholder")}
          clearAriaLabel={t("debugger.list.searchClear")}
          className="max-w-none min-w-0 w-full"
        />
      </div>

      <DebuggerTimeRangeControl />

      <div className="w-full min-w-0">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">
            {t("debugger.list.pageSize")}
          </span>
          <Select
            selectSize="sm"
            className="w-full"
            value={String(pageSize)}
            onChange={(event) =>
              setPageSize(
                Number.parseInt(event.target.value, 10) as typeof pageSize,
              )
            }
            aria-label={t("debugger.list.pageSize")}
          >
            {DEBUGGER_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>
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
              triggerLabel={t("debugger.list.filter")}
              clearAllLabel={t("debugger.list.clearFilters")}
              removeAriaLabel={(label) =>
                t("debugger.list.removeBadge", { label })
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
                      {t("debugger.list.sort")}
                    </span>
                    <Select
                      selectSize="sm"
                      className="w-auto min-w-[9rem]"
                      value={query.sort}
                      onChange={(event) =>
                        setSort(event.target.value as DebuggerListSort)
                      }
                      aria-label={t("debugger.list.sort")}
                    >
                      <option value="newest">
                        {t("debugger.list.sortNewest")}
                      </option>
                      <option value="oldest">
                        {t("debugger.list.sortOldest")}
                      </option>
                      <option value="status">
                        {t("debugger.list.sortStatus")}
                      </option>
                      <option value="title">
                        {t("debugger.list.sortTitle")}
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
          clearAllLabel={t("debugger.list.clearFilters")}
          disabled={!hasActiveFilters}
        >
          {filterBody}
        </FilterPanelBody>
      </div>

      {activeSource === "hookExecution" && hookExecutionLive ? (
        <DebuggerHookLiveStatus live={hookExecutionLive} />
      ) : null}

      <DebuggerStatusSummary counts={statusCounts} />

      <DebuggerLastUpdatedLabel />

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setJsonDialogOpen(true)}
        disabled={listEvents.length === 0}
      >
        {t("debugger.actions.viewJson")}
      </Button>
    </div>
  );

  const treeBody = isIndexProvisionSource ? (
    <div className="relative flex w-full min-w-0 flex-col gap-2 py-1">
      <DebuggerRefreshingOverlay />
      {overviewRow}
      {refreshRow}
      <IndexProvisioningTreeJobs />
    </div>
  ) : (
    <div className="relative flex w-full min-w-0 flex-col gap-2 py-1">
      <DebuggerRefreshingOverlay />
      {overviewRow}
      {refreshRow}
      {hasMoreNewer ? (
        <div className="px-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void loadNewer()}
            disabled={isLoadingNewer}
          >
            {isLoadingNewer
              ? t("debugger.list.loadingNewer")
              : t("debugger.list.loadNewer")}
          </Button>
        </div>
      ) : null}
      {listEvents.length === 0 && !isLoading ? (
        <Text className="text-muted-foreground px-2 py-3 text-sm">
          {emptyMessage}
        </Text>
      ) : (
        <ul className="space-y-2.5 px-1">
          {listEvents.map((event) => (
            <li key={buildDebugRecordKey(event.source, event.id)}>
              <DebuggerRecordRow event={event} />
            </li>
          ))}
        </ul>
      )}
      {hasMoreOlder ? (
        <div className="px-2 pb-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void loadOlder()}
            disabled={isLoadingOlder}
          >
            {isLoadingOlder
              ? t("debugger.list.loadingOlder")
              : t("debugger.list.loadOlder")}
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t(debuggerSourceLabelKey(activeSource))}
        expandLabel={t("debugger.list.expandPanel")}
        collapseLabel={t("debugger.list.collapsePanel")}
        expandedClassName={cn(
          designerTreePanelShellClassName,
          "w-full max-w-[400px]",
        )}
        collapsedClassName={designerTreePanelShellClassName}
        expandedBodyClassName="w-full min-w-0 overflow-x-hidden"
        collapsedContent={refreshRow}
        scopeSection={scopeSection}
      >
        {treeBody}
      </ItemListDesignerTreePanelShell>

      <DebuggerJsonViewDialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        title={t("debugger.actions.viewJson")}
        value={listEvents}
      />
    </>
  );
}
