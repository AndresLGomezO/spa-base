import type { DataHookExecutionRecord } from "@repo/hooks";

export interface HookExecutionSummaryRow {
  readonly hookId: string;
  readonly hookName: string;
  readonly executionCount: number;
  readonly errorCount: number;
  readonly totalWritesCreated: number;
  readonly totalWritesUpdated: number;
  readonly totalWritesDeleted: number;
  readonly avgDurationMs: number | null;
  readonly p95DurationMs: number | null;
}

export function summarizeHookExecutions(
  records: readonly DataHookExecutionRecord[],
): readonly HookExecutionSummaryRow[] {
  const grouped = new Map<
    string,
    {
      hookName: string;
      executionCount: number;
      errorCount: number;
      totalWritesCreated: number;
      totalWritesUpdated: number;
      totalWritesDeleted: number;
      durations: number[];
    }
  >();

  for (const record of records) {
    const current = grouped.get(record.hookId) ?? {
      hookName: record.hookName,
      executionCount: 0,
      errorCount: 0,
      totalWritesCreated: 0,
      totalWritesUpdated: 0,
      totalWritesDeleted: 0,
      durations: [],
    };

    current.executionCount += 1;
    if (record.status === "error") {
      current.errorCount += 1;
    }
    current.totalWritesCreated += record.writesCreated ?? 0;
    current.totalWritesUpdated += record.writesUpdated ?? 0;
    current.totalWritesDeleted += record.writesDeleted ?? 0;
    if (record.durationMs != null) {
      current.durations.push(record.durationMs);
    }

    grouped.set(record.hookId, current);
  }

  return [...grouped.entries()]
    .map(([hookId, stats]) => ({
      hookId,
      hookName: stats.hookName,
      executionCount: stats.executionCount,
      errorCount: stats.errorCount,
      totalWritesCreated: stats.totalWritesCreated,
      totalWritesUpdated: stats.totalWritesUpdated,
      totalWritesDeleted: stats.totalWritesDeleted,
      avgDurationMs: average(stats.durations),
      p95DurationMs: percentile(stats.durations, 0.95),
    }))
    .sort((left, right) => right.executionCount - left.executionCount);
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}
