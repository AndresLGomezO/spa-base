import type { DebugEvent } from "@repo/debug-logs";

interface HookExecutionWriteFields {
  readonly created: number;
  readonly updated: number;
  readonly deleted: number;
}

interface HookExecutionWriteTotals extends HookExecutionWriteFields {
  readonly total: number;
  readonly executionCount: number;
}

interface HookExecutionEntityWriteTotals extends HookExecutionWriteFields {
  readonly entityName: string;
  readonly total: number;
}

type WriteCountSource = Record<string, unknown>;

function coerceWriteCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readTopLevelWriteFields(
  source: WriteCountSource | undefined,
): HookExecutionWriteFields | null {
  if (!source) {
    return null;
  }

  const created = coerceWriteCount(source.writesCreated);
  const updated = coerceWriteCount(source.writesUpdated);
  const deleted = coerceWriteCount(source.writesDeleted);

  if (created == null && updated == null && deleted == null) {
    return null;
  }

  return {
    created: created ?? 0,
    updated: updated ?? 0,
    deleted: deleted ?? 0,
  };
}

function sumWritesByEntity(
  source: WriteCountSource | undefined,
): HookExecutionWriteFields | null {
  const writesByEntity = source?.writesByEntity;
  if (!writesByEntity || typeof writesByEntity !== "object") {
    return null;
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const counts of Object.values(
    writesByEntity as Record<string, Record<string, unknown>>,
  )) {
    if (!counts || typeof counts !== "object") {
      continue;
    }
    created += coerceWriteCount(counts.created) ?? 0;
    updated += coerceWriteCount(counts.updated) ?? 0;
    deleted += coerceWriteCount(counts.deleted) ?? 0;
  }

  if (created === 0 && updated === 0 && deleted === 0) {
    return null;
  }

  return { created, updated, deleted };
}

function sumActionTraceWrites(
  source: WriteCountSource | undefined,
): HookExecutionWriteFields | null {
  const actionTrace = source?.actionTrace;
  if (!Array.isArray(actionTrace)) {
    return null;
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const entry of actionTrace) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const count = coerceWriteCount(record.count) ?? 0;
    if (count === 0) {
      continue;
    }

    switch (record.type) {
      case "createRecords":
      case "createRecord":
        created += count;
        break;
      case "updateMatching":
      case "setField":
        updated += count;
        break;
      case "deleteMatching":
        deleted += count;
        break;
      default:
        break;
    }
  }

  if (created === 0 && updated === 0 && deleted === 0) {
    return null;
  }

  return { created, updated, deleted };
}

function hasWriteMetricsData(source: WriteCountSource): boolean {
  return (
    readTopLevelWriteFields(source) != null ||
    sumWritesByEntity(source) != null ||
    sumActionTraceWrites(source) != null
  );
}

function primaryEventMetricsSource(event: DebugEvent): WriteCountSource | null {
  const summary =
    event.summary && typeof event.summary === "object"
      ? (event.summary as WriteCountSource)
      : null;
  const payload =
    event.payload && typeof event.payload === "object"
      ? (event.payload as WriteCountSource)
      : null;

  if (summary && hasWriteMetricsData(summary)) {
    return summary;
  }
  if (payload && hasWriteMetricsData(payload)) {
    return payload;
  }
  return summary ?? payload;
}

function eventMetricSources(event: DebugEvent): readonly WriteCountSource[] {
  const primary = primaryEventMetricsSource(event);
  return primary ? [primary] : [];
}

function resolveHookExecutionWriteFields(
  event: DebugEvent,
): HookExecutionWriteFields {
  if (event.source !== "hookExecution") {
    return { created: 0, updated: 0, deleted: 0 };
  }

  const sources = eventMetricSources(event);

  for (const source of sources) {
    const topLevel = readTopLevelWriteFields(source);
    if (topLevel) {
      return topLevel;
    }
  }

  for (const source of sources) {
    const byEntity = sumWritesByEntity(source);
    if (byEntity) {
      return byEntity;
    }
  }

  for (const source of sources) {
    const fromTrace = sumActionTraceWrites(source);
    if (fromTrace) {
      return fromTrace;
    }
  }

  return { created: 0, updated: 0, deleted: 0 };
}

export function totalHookExecutionWritesFromEvent(event: DebugEvent): number {
  const fields = resolveHookExecutionWriteFields(event);
  return fields.created + fields.updated + fields.deleted;
}

export function aggregateHookExecutionWrites(
  events: readonly DebugEvent[],
): HookExecutionWriteTotals {
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let executionCount = 0;

  for (const event of events) {
    if (event.source !== "hookExecution") {
      continue;
    }
    executionCount += 1;
    const fields = resolveHookExecutionWriteFields(event);
    created += fields.created;
    updated += fields.updated;
    deleted += fields.deleted;
  }

  return {
    created,
    updated,
    deleted,
    total: created + updated + deleted,
    executionCount,
  };
}

function mergeWritesByEntityFromSource(
  totals: Map<string, HookExecutionWriteFields>,
  source: WriteCountSource,
): boolean {
  const writesByEntity = source.writesByEntity;
  if (!writesByEntity || typeof writesByEntity !== "object") {
    return false;
  }

  let merged = false;

  for (const [entityName, rawCounts] of Object.entries(
    writesByEntity as Record<string, Record<string, unknown>>,
  )) {
    if (!rawCounts || typeof rawCounts !== "object") {
      continue;
    }
    const existing = totals.get(entityName) ?? {
      created: 0,
      updated: 0,
      deleted: 0,
    };
    totals.set(entityName, {
      created: existing.created + (coerceWriteCount(rawCounts.created) ?? 0),
      updated: existing.updated + (coerceWriteCount(rawCounts.updated) ?? 0),
      deleted: existing.deleted + (coerceWriteCount(rawCounts.deleted) ?? 0),
    });
    merged = true;
  }

  return merged;
}

function mergeActionTraceWritesFromSource(
  totals: Map<string, HookExecutionWriteFields>,
  source: WriteCountSource,
): void {
  const actionTrace = source.actionTrace;
  if (!Array.isArray(actionTrace)) {
    return;
  }

  for (const entry of actionTrace) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const entityName =
      typeof record.entity === "string" ? record.entity.trim() : "";
    const count = coerceWriteCount(record.count) ?? 0;
    if (!entityName || count === 0) {
      continue;
    }

    const existing = totals.get(entityName) ?? {
      created: 0,
      updated: 0,
      deleted: 0,
    };

    switch (record.type) {
      case "createRecords":
      case "createRecord":
        totals.set(entityName, {
          ...existing,
          created: existing.created + count,
        });
        break;
      case "updateMatching":
      case "setField":
        totals.set(entityName, {
          ...existing,
          updated: existing.updated + count,
        });
        break;
      case "deleteMatching":
        totals.set(entityName, {
          ...existing,
          deleted: existing.deleted + count,
        });
        break;
      default:
        break;
    }
  }
}

export function aggregateHookExecutionWritesByEntity(
  events: readonly DebugEvent[],
): readonly HookExecutionEntityWriteTotals[] {
  const totals = new Map<string, HookExecutionWriteFields>();

  for (const event of events) {
    if (event.source !== "hookExecution") {
      continue;
    }

    const source = primaryEventMetricsSource(event);
    if (!source) {
      continue;
    }

    if (!mergeWritesByEntityFromSource(totals, source)) {
      mergeActionTraceWritesFromSource(totals, source);
    }
  }

  return [...totals.entries()]
    .map(([entityName, fields]) => ({
      entityName,
      ...fields,
      total: fields.created + fields.updated + fields.deleted,
    }))
    .filter((entry) => entry.total > 0)
    .sort((left, right) => right.total - left.total);
}
