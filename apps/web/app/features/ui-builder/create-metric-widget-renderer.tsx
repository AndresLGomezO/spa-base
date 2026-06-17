import { Text } from "@repo/ui";
import {
  filterComponentInnerStyleRules,
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
} from "@repo/ui-builder-core";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type { MetricWidgetComponentConfig } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { TFunction } from "i18next";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  normalizeMetricWidgetString,
  resolveMetricWidgetTarget,
} from "./resolve-metric-widget-reference";

interface CreateMetricWidgetRendererOptions {
  readonly catalogItems: readonly EntityCatalogEntry[];
  readonly t: TFunction;
  readonly buildLayoutContext: (
    definition: SerializableEntityDefinition,
    item: Record<string, unknown>,
  ) => LayoutRenderContext;
}

export function createMetricWidgetRenderer(
  options: CreateMetricWidgetRendererOptions,
) {
  const { catalogItems, t, buildLayoutContext } = options;

  return (config: MetricWidgetComponentConfig) => {
    const widgetId = normalizeMetricWidgetString(config.widgetId);
    if (widgetId.length === 0) {
      return (
        <Text className="text-muted-foreground text-sm">
          {t("metricsRowDesigner.metricWidgetEditor.unconfigured")}
        </Text>
      );
    }

    const resolved = resolveMetricWidgetTarget(catalogItems, config);
    if (!resolved) {
      return (
        <Text className="text-muted-foreground text-sm">
          {t("metricsRowDesigner.metricWidgetEditor.noWidgetsForEntity")}
        </Text>
      );
    }

    const { widget, entityDefinition } = resolved;
    const innerStyles = filterComponentInnerStyleRules(config.styles);
    const { containerClassName } = splitStyleRuleClasses(innerStyles);
    const containerStyle = layoutInlineStyleFromStyleRules(innerStyles);

    return (
      <div className={containerClassName} style={containerStyle}>
        <RecursiveLayoutRenderer
          layout={widget.layout}
          context={buildLayoutContext(entityDefinition, {})}
        />
      </div>
    );
  };
}
