import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type { MetricWidgetComponentConfig } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { TFunction } from "i18next";

import type {
  EntityCatalogEntry,
  EntityName,
} from "../../entities/entity-catalog";

interface CreateMetricWidgetRendererOptions {
  readonly getDefinition: (
    entityName: EntityName,
  ) => EntityCatalogEntry | undefined;
  readonly t: TFunction;
  readonly buildLayoutContext: (
    definition: SerializableEntityDefinition,
    item: Record<string, unknown>,
  ) => LayoutRenderContext;
}

export function createMetricWidgetRenderer(
  options: CreateMetricWidgetRendererOptions,
) {
  const { getDefinition, t, buildLayoutContext } = options;

  return (config: MetricWidgetComponentConfig) => {
    if (!config.entityName || !config.widgetId) {
      return (
        <Text className="text-muted-foreground text-sm">
          {t("metricsRowDesigner.metricWidgetEditor.unconfigured")}
        </Text>
      );
    }

    const entityDefinition = getDefinition(config.entityName as EntityName);
    if (!entityDefinition) {
      return (
        <Text className="text-muted-foreground text-sm">
          {t("metricsRowDesigner.metricWidgetEditor.noWidgetsForEntity")}
        </Text>
      );
    }

    const widget = entityDefinition.ui.metricWidgets?.find(
      (item) => item.id === config.widgetId,
    );

    if (!widget) {
      return (
        <Text className="text-muted-foreground text-sm">
          {t("metricsRowDesigner.metricWidgetEditor.noWidgetsForEntity")}
        </Text>
      );
    }

    return (
      <RecursiveLayoutRenderer
        layout={widget.layout}
        context={buildLayoutContext(entityDefinition, {})}
      />
    );
  };
}
