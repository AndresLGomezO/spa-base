/** Browser-safe permission constants (no Node.js crypto). */

export const ENTITY_QUERY_DEFINITION_PERMISSIONS = [
  "entityQueryDefinition.read",
  "entityQueryDefinition.create",
  "entityQueryDefinition.update",
  "entityQueryDefinition.delete",
] as const;

export const ENTITY_QUERY_PERMISSIONS = [
  ...ENTITY_QUERY_DEFINITION_PERMISSIONS,
] as const;
