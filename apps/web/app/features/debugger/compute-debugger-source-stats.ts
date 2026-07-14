import type {
  DebugEvent,
  DebugEventSource,
  DebugEventStatus,
} from "../../lib/api-client";
import {
  aggregateHookExecutionWrites,
  aggregateHookExecutionWritesByEntity,
  totalHookExecutionWritesFromEvent,
} from "./hook-execution-presentation";

export interface DebuggerStatGroup {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly errorCount?: number;
}

export interface DebuggerBarChartStats {
  readonly id: string;
  readonly titleKey:
    | "debugger.summary.writesByEntity"
    | "debugger.summary.topEntities"
    | "debugger.summary.topHooks"
    | "debugger.summary.topHooksByWrites"
    | "debugger.summary.topHooksByDuration"
    | "debugger.summary.topRoutes"
    | "debugger.summary.topFeatures"
    | "debugger.summary.topActions"
    | "debugger.summary.statusCodes";
  readonly groups: readonly DebuggerStatGroup[];
}

export interface DebuggerTimelineBucket {
  readonly label: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly total: number;
  readonly errors: number;
}

export interface DebuggerSourceStats {
  readonly total: number;
  readonly statusCounts: Partial<Record<DebugEventStatus, number>>;
  readonly errorRate: number | null;
  readonly avgDurationMs: number | null;
  readonly totalWrites: number | null;
  readonly writesCreated: number | null;
  readonly writesUpdated: number | null;
  readonly writesDeleted: number | null;
  readonly writeExecutionCount: number | null;
  readonly avgTotalMs: number | null;
  readonly avgHooksMs: number | null;
  readonly avgQueryMs: number | null;
  readonly inProgressCount: number;
  readonly uniqueActors: number | null;
  readonly emailIngestFetched: number | null;
  readonly emailIngestQueued: number | null;
  readonly emailIngestProcessing: number | null;
  readonly emailIngestFinished: number | null;
  readonly emailIngestProcessed: number | null;
  readonly emailIngestFailedMessages: number | null;
  readonly barCharts: readonly DebuggerBarChartStats[];
  readonly timelineBuckets: readonly DebuggerTimelineBucket[];
  readonly attentionItems: readonly DebugEvent[];
}

const ERROR_STATUSES = new Set<DebugEventStatus>(["error", "failed"]);
const IN_PROGRESS_STATUSES = new Set<DebugEventStatus>(["running", "pending"]);

export function countByStatus(
  events: readonly DebugEvent[],
): Partial<Record<DebugEventStatus, number>> {
  const counts: Partial<Record<DebugEventStatus, number>> = {};

  for (const event of events) {
    if (!event.status) {
      continue;
    }
    counts[event.status] = (counts[event.status] ?? 0) + 1;
  }

  return counts;
}

export function avgNumericSummary(
  events: readonly DebugEvent[],
  field: string,
): number | null {
  const values: number[] = [];

  for (const event of events) {
    const raw = event.summary?.[field];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      values.push(raw);
    }
  }

  if (values.length === 0) {
    return null;
  }

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function summaryString(event: DebugEvent, field: string): string | null {
  const raw = event.summary?.[field];
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isErrorEvent(event: DebugEvent): boolean {
  return event.status != null && ERROR_STATUSES.has(event.status);
}

export function topBySummaryField(
  events: readonly DebugEvent[],
  field: string,
  limit: number,
  options?: {
    readonly onlyErrors?: boolean;
    readonly trackErrors?: boolean;
  },
): DebuggerStatGroup[] {
  const groups = new Map<
    string,
    { label: string; count: number; errorCount: number }
  >();

  for (const event of events) {
    if (options?.onlyErrors && !isErrorEvent(event)) {
      continue;
    }

    const label =
      summaryString(event, field) ??
      (field === "feature" ? event.subtitle?.trim() : null) ??
      event.title.trim();
    if (!label) {
      continue;
    }

    const existing = groups.get(label) ?? {
      label,
      count: 0,
      errorCount: 0,
    };
    existing.count += 1;
    if (options?.trackErrors && isErrorEvent(event)) {
      existing.errorCount += 1;
    }
    groups.set(label, existing);
  }

  return [...groups.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
    .map((entry) => ({
      key: entry.label,
      label: entry.label,
      count: entry.count,
      ...(options?.trackErrors ? { errorCount: entry.errorCount } : {}),
    }));
}

function topByTitle(
  events: readonly DebugEvent[],
  limit: number,
): DebuggerStatGroup[] {
  const groups = new Map<string, DebuggerStatGroup>();

  for (const event of events) {
    const label = event.title.trim();
    if (!label) {
      continue;
    }
    const existing = groups.get(label);
    if (existing) {
      groups.set(label, { ...existing, count: existing.count + 1 });
      continue;
    }
    groups.set(label, { key: label, label, count: 1 });
  }

  return [...groups.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

function topSlowestRoutes(
  events: readonly DebugEvent[],
  limit: number,
): DebuggerStatGroup[] {
  return [...events]
    .filter((event) => typeof event.summary?.totalMs === "number")
    .sort(
      (left, right) =>
        Number(right.summary?.totalMs ?? 0) -
        Number(left.summary?.totalMs ?? 0),
    )
    .slice(0, limit)
    .map((event) => ({
      key: event.id,
      label: event.title,
      count: Number(event.summary?.totalMs ?? 0),
    }));
}

function topByStatusCode(
  events: readonly DebugEvent[],
  limit: number,
): DebuggerStatGroup[] {
  return topBySummaryField(events, "statusCode", limit).map((group) => ({
    ...group,
    label: String(group.label),
  }));
}

function computeErrorRate(
  events: readonly DebugEvent[],
  activeSource: DebugEventSource,
): number | null {
  if (events.length === 0) {
    return null;
  }

  switch (activeSource) {
    case "audit":
      return null;
    case "ai": {
      const failed = events.filter((event) => event.status === "failed").length;
      return Math.round((failed / events.length) * 100);
    }
    default: {
      const errors = events.filter((event) => isErrorEvent(event)).length;
      return Math.round((errors / events.length) * 100);
    }
  }
}

export function pickAttentionEvents(
  events: readonly DebugEvent[],
  activeSource: DebugEventSource,
  limit: number,
): DebugEvent[] {
  const sorted = [...events].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  );

  switch (activeSource) {
    case "hookExecution":
    case "hookLog":
      return sorted
        .filter(
          (event) =>
            isErrorEvent(event) ||
            event.status === "running" ||
            event.status === "pending",
        )
        .slice(0, limit);
    case "ai":
    case "emailIngest":
      return sorted
        .filter(
          (event) =>
            event.status === "failed" ||
            event.status === "running" ||
            event.status === "pending" ||
            (typeof event.summary?.failed === "number" &&
              event.summary.failed > 0),
        )
        .slice(0, limit);
    case "requestPerf":
      return sorted
        .filter((event) => isErrorEvent(event))
        .concat(
          sorted
            .filter((event) => !isErrorEvent(event))
            .sort(
              (left, right) =>
                Number(right.summary?.totalMs ?? 0) -
                Number(left.summary?.totalMs ?? 0),
            ),
        )
        .slice(0, limit);
    case "audit":
      return sorted.slice(0, limit);
    default:
      return [];
  }
}

function countUniqueActors(events: readonly DebugEvent[]): number | null {
  const actors = new Set<string>();

  for (const event of events) {
    const actorId = summaryString(event, "actorId");
    if (actorId) {
      actors.add(actorId);
    }
  }

  return actors.size > 0 ? actors.size : null;
}

function sumNumericSummary(
  events: readonly DebugEvent[],
  field: string,
): number {
  let total = 0;
  for (const event of events) {
    const raw = event.summary?.[field];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      total += raw;
    }
  }
  return total;
}

function formatTimelineLabel(ms: number, rangeMs: number): string {
  if (rangeMs >= 86_400_000) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  }
  if (rangeMs >= 3_600_000) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(ms));
}

export function computeTimelineBuckets(
  events: readonly DebugEvent[],
  bucketCount = 10,
): DebuggerTimelineBucket[] {
  if (events.length === 0) {
    return [];
  }

  const timestamps = events
    .map((event) => Date.parse(event.timestamp))
    .filter(Number.isFinite);
  if (timestamps.length === 0) {
    return [];
  }

  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const range = max - min || 1;
  const bucketDuration = range / bucketCount;
  const buckets: Array<{
    label: string;
    startMs: number;
    endMs: number;
    total: number;
    errors: number;
  }> = Array.from({ length: bucketCount }, (_, index) => {
    const startMs = min + index * bucketDuration;
    const endMs =
      index === bucketCount - 1 ? max : min + (index + 1) * bucketDuration;
    return {
      label: formatTimelineLabel(startMs, range),
      startMs,
      endMs,
      total: 0,
      errors: 0,
    };
  });

  for (const event of events) {
    const timestamp = Date.parse(event.timestamp);
    if (!Number.isFinite(timestamp)) {
      continue;
    }
    const index = Math.min(
      bucketCount - 1,
      Math.floor(((timestamp - min) / range) * bucketCount),
    );
    const bucket = buckets[index];
    if (!bucket) {
      continue;
    }
    bucket.total += 1;
    if (isErrorEvent(event)) {
      bucket.errors += 1;
    }
  }

  return buckets;
}

function topHooksByWrites(
  events: readonly DebugEvent[],
  limit: number,
): DebuggerStatGroup[] {
  const groups = new Map<string, { label: string; count: number }>();

  for (const event of events) {
    if (event.source !== "hookExecution") {
      continue;
    }
    const hookId =
      typeof event.summary?.hookId === "string" ? event.summary.hookId : null;
    const hookName =
      typeof event.summary?.hookName === "string"
        ? event.summary.hookName
        : event.title;
    if (!hookId) {
      continue;
    }
    const writes = totalHookExecutionWritesFromEvent(event);
    const existing = groups.get(hookId) ?? { label: hookName, count: 0 };
    existing.count += writes;
    groups.set(hookId, existing);
  }

  return [...groups.values()]
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
    .map((entry) => ({
      key: entry.label,
      label: entry.label,
      count: entry.count,
    }));
}

function topHooksByDuration(
  events: readonly DebugEvent[],
  limit: number,
): DebuggerStatGroup[] {
  const groups = new Map<
    string,
    { label: string; durationMs: number; count: number }
  >();

  for (const event of events) {
    if (event.source !== "hookExecution") {
      continue;
    }
    const durationMs = event.summary?.durationMs;
    if (typeof durationMs !== "number") {
      continue;
    }
    const hookId =
      typeof event.summary?.hookId === "string" ? event.summary.hookId : null;
    const hookName =
      typeof event.summary?.hookName === "string"
        ? event.summary.hookName
        : event.title;
    if (!hookId) {
      continue;
    }
    const existing = groups.get(hookId);
    if (!existing || durationMs > existing.durationMs) {
      groups.set(hookId, { label: hookName, durationMs, count: 1 });
    }
  }

  return [...groups.values()]
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, limit)
    .map((entry) => ({
      key: entry.label,
      label: entry.label,
      count: entry.durationMs,
    }));
}

function topEntitiesByWrites(
  events: readonly DebugEvent[],
  limit: number,
): DebuggerStatGroup[] {
  return aggregateHookExecutionWritesByEntity(events)
    .slice(0, limit)
    .map((entry) => ({
      key: entry.entityName,
      label: entry.entityName,
      count: entry.total,
    }));
}

function buildBarCharts(
  events: readonly DebugEvent[],
  activeSource: DebugEventSource,
): DebuggerBarChartStats[] {
  switch (activeSource) {
    case "hookExecution":
      return [
        {
          id: "entities-by-writes",
          titleKey: "debugger.summary.writesByEntity",
          groups: topEntitiesByWrites(events, 6),
        },
        {
          id: "hooks-by-writes",
          titleKey: "debugger.summary.topHooksByWrites",
          groups: topHooksByWrites(events, 5),
        },
        {
          id: "hooks-by-duration",
          titleKey: "debugger.summary.topHooksByDuration",
          groups: topHooksByDuration(events, 5),
        },
        {
          id: "hooks",
          titleKey: "debugger.summary.topHooks",
          groups: topBySummaryField(events, "hookId", 5, {
            onlyErrors: true,
          }),
        },
      ];
    case "hookLog":
      return [
        {
          id: "hooks",
          titleKey: "debugger.summary.topHooks",
          groups: topBySummaryField(events, "hookId", 5, {
            onlyErrors: true,
          }),
        },
      ];
    case "ai":
      return [
        {
          id: "features",
          titleKey: "debugger.summary.topFeatures",
          groups: topBySummaryField(events, "feature", 5),
        },
      ];
    case "audit":
      return [
        {
          id: "actions",
          titleKey: "debugger.summary.topActions",
          groups: topByTitle(events, 5),
        },
      ];
    case "requestPerf":
      return [
        {
          id: "routes",
          titleKey: "debugger.summary.topRoutes",
          groups: topSlowestRoutes(events, 5),
        },
        {
          id: "statusCodes",
          titleKey: "debugger.summary.statusCodes",
          groups: topByStatusCode(events, 5),
        },
      ];
    default:
      return [];
  }
}

export function computeDebuggerSourceStats(
  events: readonly DebugEvent[],
  activeSource: DebugEventSource,
): DebuggerSourceStats {
  const statusCounts = countByStatus(events);
  const inProgressCount = events.filter(
    (event) => event.status != null && IN_PROGRESS_STATUSES.has(event.status),
  ).length;

  const writeTotals =
    activeSource === "hookExecution"
      ? aggregateHookExecutionWrites(events)
      : null;

  const emailIngest =
    activeSource === "emailIngest"
      ? {
          emailIngestFetched: sumNumericSummary(events, "fetched"),
          emailIngestQueued: sumNumericSummary(events, "queued"),
          emailIngestProcessing: sumNumericSummary(events, "processing"),
          emailIngestFinished: sumNumericSummary(events, "finished"),
          emailIngestProcessed: sumNumericSummary(events, "processed"),
          emailIngestFailedMessages: sumNumericSummary(events, "failed"),
        }
      : {
          emailIngestFetched: null,
          emailIngestQueued: null,
          emailIngestProcessing: null,
          emailIngestFinished: null,
          emailIngestProcessed: null,
          emailIngestFailedMessages: null,
        };

  return {
    total: events.length,
    statusCounts,
    errorRate: computeErrorRate(events, activeSource),
    avgDurationMs:
      activeSource === "hookExecution"
        ? avgNumericSummary(events, "durationMs")
        : null,
    totalWrites: writeTotals?.total ?? null,
    writesCreated: writeTotals?.created ?? null,
    writesUpdated: writeTotals?.updated ?? null,
    writesDeleted: writeTotals?.deleted ?? null,
    writeExecutionCount: writeTotals?.executionCount ?? null,
    avgTotalMs:
      activeSource === "requestPerf"
        ? avgNumericSummary(events, "totalMs")
        : null,
    avgHooksMs:
      activeSource === "requestPerf"
        ? avgNumericSummary(events, "hooksMs")
        : null,
    avgQueryMs:
      activeSource === "requestPerf"
        ? avgNumericSummary(events, "queryMs")
        : null,
    inProgressCount,
    uniqueActors: activeSource === "audit" ? countUniqueActors(events) : null,
    ...emailIngest,
    barCharts: buildBarCharts(events, activeSource),
    timelineBuckets: computeTimelineBuckets(events),
    attentionItems: pickAttentionEvents(events, activeSource, 5),
  };
}
