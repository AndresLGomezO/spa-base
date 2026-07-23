import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  Input,
  SearchField,
  Text,
  useFilterPanelDismiss,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { cn } from "@repo/theme/utils";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import {
  listDebugEvents,
  type DebugEvent,
  type DebugEventStatus,
} from "../../lib/api-client";
import {
  DebuggerTimeRangeControl,
  useLocalDebuggerTimeRange,
} from "./components/DebuggerTimeRangeControl";
import { DebuggerStatusBadge } from "./components/DebuggerStatusBadge";
import { DebuggerStatusSummary } from "./components/DebuggerStatusSummary";
import {
  DEBUGGER_LIST_ROW_HOVER_CLASS,
  DEBUGGER_STATUS_ACCENT_CLASS,
  type DebuggerListSort,
} from "./debugger-status-styles";
import { writeDebuggerPageSize } from "./debugger-page-size";
import {
  getBrowserTimeZone,
  writeDebuggerTimeSelection,
  writeDebuggerTimeZone,
} from "./debugger-time-range-url";
import { seedDebuggerDeepLinkEvent } from "./debugger-deep-link-seed";
import {
  type HookExecutionStatusFilter,
  type HookExecutionTypeKey,
} from "./hook-execution-live-metrics";
import {
  partitionRecordHookExecutions,
  recordHookRelatedSourceLabel,
  splitFilteredRecordHookExecutions,
} from "./record-hook-execution-sections";
import { parsePositiveInt } from "./use-debugger-list-query";
import { useLocalHookExecutionListQuery } from "./use-local-hook-execution-list-query";

const RECORD_HOOK_PAGE_SIZE = 100;

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

function buildHookExecutionDebuggerHref(
  event: DebugEvent,
  selection: Parameters<typeof writeDebuggerTimeSelection>[1],
  timeZone: string,
): string {
  const recordKey = seedDebuggerDeepLinkEvent(event);
  const params = new URLSearchParams();
  params.set("record", recordKey);
  const emailLedgerId = event.summary?.emailLedgerId;
  if (typeof emailLedgerId === "string" && emailLedgerId.trim().length > 0) {
    params.set("emailLedgerId", emailLedgerId.trim());
  } else {
    const entityName = event.summary?.entityName;
    const recordId = event.summary?.recordId;
    if (typeof entityName === "string" && entityName.trim().length > 0) {
      params.set("entityName", entityName);
    }
    if (typeof recordId === "string" && recordId.trim().length > 0) {
      params.set("recordId", recordId);
    }
  }
  writeDebuggerTimeSelection(params, selection);
  // Debugger defaults to 5m; always pin the panel's selection so the record stays visible.
  if (selection.mode === "preset" && !params.has("time")) {
    params.set("time", selection.preset);
  }
  writeDebuggerTimeZone(params, timeZone, getBrowserTimeZone());
  // Deep links often miss the default page of 10; widen the first fetch.
  writeDebuggerPageSize(params, 100);
  const query = params.toString();
  return `/debugger/hook-executions${query ? `?${query}` : ""}`;
}

function RecordHookExecutionRow({
  event,
  onOpen,
  relatedSourceLabel,
}: {
  readonly event: DebugEvent;
  readonly onOpen: () => void;
  readonly relatedSourceLabel?: string | null;
}) {
  const { t, i18n } = useTranslation("common");
  const accentClass = event.status
    ? (DEBUGGER_STATUS_ACCENT_CLASS[event.status] ?? "")
    : "";
  const timestampLabel = Number.isFinite(Date.parse(event.timestamp))
    ? new Intl.DateTimeFormat(i18n.language, {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(new Date(event.timestamp))
    : event.timestamp;

  return (
    <button
      type="button"
      className={cn(
        "group/node flex w-full min-w-0 cursor-pointer items-start gap-1 rounded-md border-l-2 py-2 pr-1 text-left transition-colors duration-150",
        accentClass.length > 0 ? accentClass : "border-l-transparent",
        DEBUGGER_LIST_ROW_HOVER_CLASS,
      )}
      onClick={onOpen}
    >
      <div className="min-w-0 flex-1 px-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="min-w-0 break-words text-sm font-medium">
            {event.title}
          </Text>
          {event.status ? (
            <DebuggerStatusBadge status={event.status} size="compact" />
          ) : null}
          {relatedSourceLabel ? (
            <span className="bg-muted text-muted-foreground inline-flex rounded-full px-1.5 py-0 text-[10px] font-medium leading-4">
              {relatedSourceLabel}
            </span>
          ) : null}
          <ExternalLink
            aria-hidden
            className="text-muted-foreground ml-auto size-3.5 shrink-0 opacity-0 transition-opacity group-hover/node:opacity-100"
          />
        </div>
        {event.subtitle ? (
          <Text className="text-muted-foreground mt-0.5 break-words text-xs">
            {event.subtitle}
          </Text>
        ) : null}
        <Text className="text-muted-foreground mt-0.5 text-xs">
          {timestampLabel}
        </Text>
        <span className="sr-only">
          {t("entity.recordHooks.openInDebugger")}
        </span>
      </div>
    </button>
  );
}

interface RecordHookExecutionsThirdRailPanelProps {
  readonly entityName: string;
  readonly recordId: string;
  readonly relatedEmailLedgerId?: string;
}

export function RecordHookExecutionsThirdRailPanel({
  entityName,
  recordId,
  relatedEmailLedgerId,
}: RecordHookExecutionsThirdRailPanelProps) {
  const { t } = useTranslation("common");
  const { tenantId } = useAuth();
  const { selection, setSelection, timeZone, setTimeZone, resolveBounds } =
    useLocalDebuggerTimeRange({ mode: "preset", preset: "1d" });
  const timeBounds = useMemo(() => resolveBounds(), [resolveBounds]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const enableRelated =
    entityName !== "email" &&
    typeof relatedEmailLedgerId === "string" &&
    relatedEmailLedgerId.length > 0;

  const directQuery = useQuery({
    queryKey: [
      "record-hook-executions",
      "direct",
      tenantId,
      entityName,
      recordId,
      timeBounds.sinceIso,
      timeBounds.untilIso,
    ],
    queryFn: () =>
      listDebugEvents({
        sources: ["hooks"],
        limit: RECORD_HOOK_PAGE_SIZE,
        since: timeBounds.sinceIso,
        until: timeBounds.untilIso,
        ...(entityName === "email"
          ? { emailLedgerId: recordId }
          : { entityName, recordId }),
      }),
    enabled: Boolean(tenantId && entityName && recordId),
  });

  const relatedQuery = useQuery({
    queryKey: [
      "record-hook-executions",
      "related",
      tenantId,
      relatedEmailLedgerId,
      timeBounds.sinceIso,
      timeBounds.untilIso,
    ],
    queryFn: () =>
      listDebugEvents({
        sources: ["hooks"],
        limit: RECORD_HOOK_PAGE_SIZE,
        since: timeBounds.sinceIso,
        until: timeBounds.untilIso,
        emailLedgerId: relatedEmailLedgerId!,
      }),
    enabled: Boolean(tenantId && enableRelated),
  });

  const sections = useMemo(
    () =>
      partitionRecordHookExecutions(
        directQuery.data?.items ?? [],
        enableRelated ? (relatedQuery.data?.items ?? []) : [],
      ),
    [directQuery.data?.items, enableRelated, relatedQuery.data?.items],
  );

  const sourceEvents = useMemo(
    () => [...sections.direct, ...sections.related],
    [sections],
  );

  const {
    query,
    listEvents,
    statusCounts,
    availableStatuses,
    availableExecutionTypes,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleShowSkipped,
    toggleExecutionType,
    setMinWrites,
    setMinDurationMs,
    clearFilters,
    debuggerStatusLabelKey,
    hookExecutionTypeLabelKey,
  } = useLocalHookExecutionListQuery(sourceEvents, timeBounds);

  const filteredSections = useMemo(
    () => splitFilteredRecordHookExecutions(listEvents, sections),
    [listEvents, sections],
  );

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
          const status = badge.id.slice("status:".length);
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
      debuggerStatusLabelKey,
      hookExecutionTypeLabelKey,
      query.sort,
      t,
    ],
  );

  const openEvent = (event: DebugEvent) => {
    const href = buildHookExecutionDebuggerHref(event, selection, timeZone);
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("debugger.list.filterByStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {availableStatuses.map((status: HookExecutionStatusFilter) => (
            <Checkbox
              key={status}
              id={`record-hooks-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                <span className="inline-flex items-center gap-2">
                  <DebuggerStatusBadge status={status} size="compact" />
                </span>
              }
            />
          ))}
          <Checkbox
            id="record-hooks-show-skipped"
            checked={query.showSkipped}
            onChange={toggleShowSkipped}
            label={t("debugger.list.showSkipped")}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("debugger.list.filterByTypology")}
        </Text>
        <div className="flex flex-col gap-2">
          {availableExecutionTypes.map((executionType) => (
            <Checkbox
              key={executionType}
              id={`record-hooks-execution-type-${executionType}`}
              checked={query.executionTypes.includes(executionType)}
              onChange={() => toggleExecutionType(executionType)}
              label={t(hookExecutionTypeLabelKey(executionType))}
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
              value={query.minDurationMs > 0 ? String(query.minDurationMs) : ""}
              onChange={(event) =>
                setMinDurationMs(parsePositiveInt(event.target.value))
              }
              placeholder="0"
              className="h-8"
            />
          </label>
        </div>
      </div>
    </div>
  );

  const isLoading =
    directQuery.isLoading || (enableRelated && relatedQuery.isLoading);
  const isError =
    directQuery.isError || (enableRelated && relatedQuery.isError);
  const showRelatedSection = enableRelated;
  const bothSectionsEmpty =
    filteredSections.direct.length === 0 &&
    filteredSections.related.length === 0;
  const sourceEmpty = sourceEvents.length === 0;

  const emptyMessage = isLoading
    ? t("loading")
    : isError
      ? t("entity.recordHooks.loadFailed")
      : sourceEmpty
        ? t("entity.recordHooks.empty")
        : t("debugger.list.emptyFiltered");

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden">
      <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 px-1">
        <SearchField
          value={query.search}
          onChange={setSearch}
          placeholder={t("debugger.list.searchPlaceholder")}
          ariaLabel={t("debugger.list.searchPlaceholder")}
          clearAriaLabel={t("debugger.list.searchClear")}
          className="max-w-none min-w-0 w-full"
        />

        <DebuggerTimeRangeControl
          selection={selection}
          onSelectionChange={setSelection}
          timeZone={timeZone}
          onTimeZoneChange={setTimeZone}
        />

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

        <DebuggerStatusSummary
          counts={statusCounts as Partial<Record<DebugEventStatus, number>>}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {bothSectionsEmpty ? (
          <Text className="text-muted-foreground px-2 py-4 text-sm">
            {emptyMessage}
          </Text>
        ) : (
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-1">
              {showRelatedSection ? (
                <Text className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
                  {t("entity.recordHooks.sectionThisRecord")}
                </Text>
              ) : null}
              {filteredSections.direct.length === 0 ? (
                <Text className="text-muted-foreground px-2 py-2 text-sm">
                  {t("entity.recordHooks.sectionThisRecordEmpty")}
                </Text>
              ) : (
                filteredSections.direct.map((event) => (
                  <RecordHookExecutionRow
                    key={event.id}
                    event={event}
                    onOpen={() => openEvent(event)}
                  />
                ))
              )}
            </section>

            {showRelatedSection ? (
              <section className="flex flex-col gap-1">
                <Text className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
                  {t("entity.recordHooks.sectionRelatedEmail")}
                </Text>
                {filteredSections.related.length === 0 ? (
                  <Text className="text-muted-foreground px-2 py-2 text-sm">
                    {t("entity.recordHooks.sectionRelatedEmailEmpty")}
                  </Text>
                ) : (
                  filteredSections.related.map((event) => (
                    <RecordHookExecutionRow
                      key={event.id}
                      event={event}
                      relatedSourceLabel={recordHookRelatedSourceLabel(event)}
                      onOpen={() => openEvent(event)}
                    />
                  ))
                )}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
