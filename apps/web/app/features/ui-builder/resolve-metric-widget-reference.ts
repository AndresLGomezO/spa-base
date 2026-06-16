import type { MetricWidgetComponentConfig } from "@repo/ui-builder-core";
import type { MetricWidgetDefinition } from "@repo/entities";

import type {
  EntityCatalogEntry,
  EntityName,
} from "../../entities/entity-catalog";
import { tryGetEntityDefinition } from "../../entities/entity-catalog";

export function normalizeMetricWidgetString(value: string | undefined): string {
  return (value ?? "").trim();
}

export function findMetricWidgetEntityName(
  catalog: readonly EntityCatalogEntry[],
  widgetId: string,
): EntityName | undefined {
  const normalizedWidgetId = normalizeMetricWidgetString(widgetId);
  if (normalizedWidgetId.length === 0) {
    return undefined;
  }

  for (const entry of catalog) {
    if (
      entry.ui.metricWidgets?.some((widget) => widget.id === normalizedWidgetId)
    ) {
      return entry.name;
    }
  }

  return undefined;
}

export function resolveMetricWidgetTarget(
  catalog: readonly EntityCatalogEntry[],
  config: MetricWidgetComponentConfig,
): {
  readonly entityName: EntityName;
  readonly widget: MetricWidgetDefinition;
  readonly entityDefinition: EntityCatalogEntry;
} | null {
  const widgetId = normalizeMetricWidgetString(config.widgetId);
  if (widgetId.length === 0) {
    return null;
  }

  let entityName = normalizeMetricWidgetString(config.entityName) as EntityName;
  if (entityName.length === 0) {
    entityName = findMetricWidgetEntityName(catalog, widgetId) ?? "";
  }
  if (entityName.length === 0) {
    return null;
  }

  const entityDefinition = tryGetEntityDefinition(entityName, catalog);
  if (!entityDefinition) {
    return null;
  }

  const widget = entityDefinition.ui.metricWidgets?.find(
    (item) => item.id === widgetId,
  );
  if (!widget) {
    return null;
  }

  return { entityName, widget, entityDefinition };
}
