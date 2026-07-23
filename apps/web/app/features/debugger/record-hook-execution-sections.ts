import type { DebugEvent } from "../../lib/api-client";

interface RecordHookExecutionSections {
  readonly direct: readonly DebugEvent[];
  readonly related: readonly DebugEvent[];
}

/**
 * Build direct vs related sections for the record hooks third rail.
 * Related executions that already appear in direct are dropped.
 */
export function partitionRecordHookExecutions(
  direct: readonly DebugEvent[],
  related: readonly DebugEvent[],
): RecordHookExecutionSections {
  const directIds = new Set(direct.map((event) => event.id));
  return {
    direct,
    related: related.filter((event) => !directIds.has(event.id)),
  };
}

export function splitFilteredRecordHookExecutions(
  filtered: readonly DebugEvent[],
  sections: RecordHookExecutionSections,
): RecordHookExecutionSections {
  const directIds = new Set(sections.direct.map((event) => event.id));
  const relatedIds = new Set(sections.related.map((event) => event.id));
  return {
    direct: filtered.filter((event) => directIds.has(event.id)),
    related: filtered.filter((event) => relatedIds.has(event.id)),
  };
}

export function recordHookRelatedSourceLabel(event: DebugEvent): string | null {
  const entityName =
    typeof event.summary?.entityName === "string"
      ? event.summary.entityName.trim()
      : "";
  const operation =
    typeof event.summary?.operation === "string"
      ? event.summary.operation.trim()
      : "";
  const phase =
    typeof event.summary?.phase === "string" ? event.summary.phase.trim() : "";

  if (entityName.length === 0) {
    return null;
  }
  if (phase.length > 0 && operation.length > 0) {
    const opLabel =
      operation.length > 0
        ? `${operation.charAt(0).toUpperCase()}${operation.slice(1)}`
        : operation;
    return `${entityName} · ${phase}${opLabel}`;
  }
  if (event.subtitle && event.subtitle.trim().length > 0) {
    return `${entityName} · ${event.subtitle.trim()}`;
  }
  return entityName;
}
