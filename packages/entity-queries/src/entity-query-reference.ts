/**
 * Stable reference to a tenant-wide entity query definition.
 * Used by UI-builder query-viewer components (Phase 2).
 */
export interface EntityQueryDefinitionReference {
  readonly entityQueryDefinitionId: string;
}

export function isEntityQueryDefinitionReference(
  value: unknown,
): value is EntityQueryDefinitionReference {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.entityQueryDefinitionId === "string" &&
    record.entityQueryDefinitionId.trim().length > 0
  );
}
