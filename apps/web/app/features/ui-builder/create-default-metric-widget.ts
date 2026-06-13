import type { MetricWidgetDefinition } from "@repo/entities";
import { createDefaultUiLayout, createLayoutId } from "@repo/ui-builder-core";

import { ensureMetricsWidgetNestedLayoutRoot } from "./ensure-metrics-widget-nested-layout-root";

export function createDefaultMetricWidget(
  name: string,
): MetricWidgetDefinition {
  return {
    id: createLayoutId("widget"),
    name,
    layout: ensureMetricsWidgetNestedLayoutRoot(
      createDefaultUiLayout(["name"]),
    ),
  };
}
