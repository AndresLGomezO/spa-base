import type { EntityQueryDefinitionRecord } from "./types.js";

export interface EntityQueryDefinitionLookup {
  getById(
    tenantId: string,
    id: string,
  ): Promise<EntityQueryDefinitionRecord | null>;
  list(tenantId: string): Promise<readonly EntityQueryDefinitionRecord[]>;
}

export async function resolveEntityQueryDefinitionByReference(
  repository: EntityQueryDefinitionLookup,
  tenantId: string,
  reference: string,
): Promise<EntityQueryDefinitionRecord | null> {
  const normalized = reference.trim();
  if (normalized.length === 0) {
    return null;
  }

  const byId = await repository.getById(tenantId, normalized);
  if (byId) {
    return byId;
  }

  const all = await repository.list(tenantId);
  const normalizedName = normalized.toLowerCase();
  return (
    all.find((item) => item.name.trim().toLowerCase() === normalizedName) ??
    null
  );
}
