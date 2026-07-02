import type { DebugEvent, HookExecutionLiveCounts } from "../../lib/api-client";

export const HOOK_EXECUTION_LIVE_METRIC_KEYS = [
  "inlineRunning",
  "deferredRunning",
  "queuedPending",
  "cloudRunning",
] as const;

export type HookExecutionLiveMetricKey =
  (typeof HOOK_EXECUTION_LIVE_METRIC_KEYS)[number];

export const HOOK_EXECUTION_TYPE_KEYS = ["sync", "deferred", "queued"] as const;

export type HookExecutionTypeKey = (typeof HOOK_EXECUTION_TYPE_KEYS)[number];

export const HOOK_EXECUTION_STATUS_FILTERS = [
  "running",
  "queued",
  "success",
  "error",
  "skipped",
] as const;

export type HookExecutionStatusFilter =
  (typeof HOOK_EXECUTION_STATUS_FILTERS)[number];

const HOOK_EXECUTION_TYPE_KEY_SET = new Set<string>(HOOK_EXECUTION_TYPE_KEYS);
const HOOK_EXECUTION_STATUS_FILTER_SET = new Set<string>(
  HOOK_EXECUTION_STATUS_FILTERS,
);

export function hookExecutionLiveMetricLabelKey(
  key: HookExecutionLiveMetricKey,
): `debugger.summary.${HookExecutionLiveMetricKey}` {
  return `debugger.summary.${key}`;
}

export function hookExecutionTypeLabelKey(
  key: HookExecutionTypeKey,
): `debugger.executionType.${HookExecutionTypeKey}` {
  return `debugger.executionType.${key}`;
}

function isHookExecutionTypeKey(value: string): value is HookExecutionTypeKey {
  return HOOK_EXECUTION_TYPE_KEY_SET.has(value);
}

function isHookExecutionStatusFilter(
  value: string,
): value is HookExecutionStatusFilter {
  return HOOK_EXECUTION_STATUS_FILTER_SET.has(value);
}

function readHookExecutionMode(event: DebugEvent): string | null {
  const fromSummary = event.summary?.executionMode;
  if (typeof fromSummary === "string" && fromSummary.length > 0) {
    return fromSummary;
  }
  if (event.payload && typeof event.payload === "object") {
    const mode = (event.payload as Record<string, unknown>).executionMode;
    if (typeof mode === "string" && mode.length > 0) {
      return mode;
    }
  }
  return null;
}

export function hookExecutionTypeForEvent(
  event: DebugEvent,
): HookExecutionTypeKey | null {
  if (event.source !== "hookExecution") {
    return null;
  }

  const mode = readHookExecutionMode(event);
  if (mode === "sync" || mode === "deferred" || mode === "queued") {
    return mode;
  }

  return null;
}

export function eventMatchesHookExecutionType(
  event: DebugEvent,
  executionType: HookExecutionTypeKey,
): boolean {
  return hookExecutionTypeForEvent(event) === executionType;
}

export function parseHookExecutionTypes(
  raw: string | null,
): HookExecutionTypeKey[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(isHookExecutionTypeKey);
}

export function eventMatchesHookExecutionStatusFilter(
  event: DebugEvent,
  statusFilter: HookExecutionStatusFilter,
): boolean {
  if (statusFilter === "queued") {
    return event.status === "pending";
  }

  return event.status === statusFilter;
}

export function parseHookExecutionStatusFilters(
  raw: string | null,
): HookExecutionStatusFilter[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(isHookExecutionStatusFilter);
}

export function hasHookExecutionLiveActivity(
  live: HookExecutionLiveCounts | null | undefined,
): boolean {
  if (!live) {
    return false;
  }
  return live.pending > 0 || live.running > 0;
}

export function hookExecutionLiveMetrics(
  live: HookExecutionLiveCounts,
): ReadonlyArray<{
  readonly key: HookExecutionLiveMetricKey;
  readonly value: number;
}> {
  return [
    { key: "inlineRunning", value: live.inlineRunning },
    { key: "deferredRunning", value: live.deferredRunning },
    { key: "queuedPending", value: live.queuedPending },
    { key: "cloudRunning", value: live.cloudRunning },
  ];
}
