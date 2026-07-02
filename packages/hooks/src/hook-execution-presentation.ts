import type { DataHookExecutionRecord } from "./data-hook-execution.js";

export function formatHookExecutionWritesSummary(
  record: Pick<
    DataHookExecutionRecord,
    "writesCreated" | "writesUpdated" | "writesDeleted"
  >,
): string | null {
  const parts: string[] = [];
  const created = record.writesCreated ?? 0;
  const updated = record.writesUpdated ?? 0;
  const deleted = record.writesDeleted ?? 0;

  if (created > 0) {
    parts.push(`+${created} created`);
  }
  if (updated > 0) {
    parts.push(`${updated} updated`);
  }
  if (deleted > 0) {
    parts.push(`${deleted} deleted`);
  }

  return parts.length > 0 ? parts.join(", ") : null;
}

export function formatHookExecutionSubtitle(
  record: Pick<
    DataHookExecutionRecord,
    | "entityName"
    | "event"
    | "status"
    | "durationMs"
    | "writesCreated"
    | "writesUpdated"
    | "writesDeleted"
  >,
): string {
  const parts = [
    record.status === "pending" || record.status === "running"
      ? `${record.entityName} · ${record.status}`
      : `${record.entityName} · ${record.event}`,
  ];

  const writes = formatHookExecutionWritesSummary(record);
  if (writes) {
    parts.push(writes);
  }

  if (record.durationMs != null) {
    parts.push(`${record.durationMs}ms`);
  }

  return parts.join(" · ");
}

export function totalHookExecutionWrites(record: {
  readonly writesCreated?: number;
  readonly writesUpdated?: number;
  readonly writesDeleted?: number;
}): number {
  return (
    (record.writesCreated ?? 0) +
    (record.writesUpdated ?? 0) +
    (record.writesDeleted ?? 0)
  );
}
