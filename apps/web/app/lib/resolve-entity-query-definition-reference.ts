import type { EntityQueryDefinitionRecord } from "./api-client.js";

export function resolveEntityQueryDefinitionDocumentId(
  entityQueryDefinitionId: string,
  definitions: readonly EntityQueryDefinitionRecord[],
): string | undefined {
  const normalized = entityQueryDefinitionId.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (definitions.some((item) => item.id === normalized)) {
    return normalized;
  }

  const byQueryId = definitions.find((item) => item.queryId === normalized);
  if (byQueryId) {
    return byQueryId.id;
  }

  const normalizedName = normalized.toLowerCase();
  const byName = definitions.find(
    (item) => item.name.trim().toLowerCase() === normalizedName,
  );
  if (byName) {
    return byName.id;
  }

  return normalized;
}
