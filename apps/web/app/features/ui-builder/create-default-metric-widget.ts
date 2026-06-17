import type { MetricWidgetDefinition } from "@repo/entities";
import {
  addComponentRowAt,
  createDefaultComponent,
  createLayoutId,
  beginContainerRootLayout,
} from "@repo/ui-builder-core";

export function createDefaultMetricWidget(
  name: string,
): MetricWidgetDefinition {
  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  const layout = addComponentRowAt(
    beganLayout,
    containerLocator,
    createDefaultComponent("metric-kpi"),
  );

  return {
    id: createLayoutId("widget"),
    name,
    layout: { ...layout, showActions: true },
  };
}
