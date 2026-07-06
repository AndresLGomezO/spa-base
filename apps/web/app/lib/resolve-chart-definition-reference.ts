import type { ChartDefinitionRecord } from "../lib/api-client.js";

export function resolveChartDefinitionDocumentId(
  chartDefinitionId: string,
  definitions: readonly ChartDefinitionRecord[],
): string | undefined {
  const normalized = chartDefinitionId.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (definitions.some((item) => item.id === normalized)) {
    return normalized;
  }

  const byChartId = definitions.find((item) => item.chartId === normalized);
  if (byChartId) {
    return byChartId.id;
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

export function resolveChartDefinitionRecord(
  chartDefinitionId: string,
  definitions: readonly ChartDefinitionRecord[],
): ChartDefinitionRecord | undefined {
  const documentId = resolveChartDefinitionDocumentId(
    chartDefinitionId,
    definitions,
  );
  if (!documentId) {
    return undefined;
  }

  return definitions.find((item) => item.id === documentId);
}
