import type { MetricWidgetDefinition } from "@repo/entities";
import { createDefaultUiLayout, createLayoutId } from "@repo/ui-builder-core";

export function createDefaultMetricWidget(
  name: string,
): MetricWidgetDefinition {
  return {
    id: createLayoutId("widget"),
    name,
    layout: createDefaultUiLayout(["name"]),
  };
}
