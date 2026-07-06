export const CHART_DEFINITION_PERMISSIONS = [
  "chartDefinition.read",
  "chartDefinition.create",
  "chartDefinition.update",
  "chartDefinition.delete",
] as const;

export const CHART_PERMISSIONS = [...CHART_DEFINITION_PERMISSIONS] as const;
