import type { MetricWidgetDefinition } from "@repo/entities";
import {
  createEmptyLayout,
  createLayoutId,
  ensureContainerRoot,
} from "@repo/ui-builder-core";

export function createDefaultMetricWidget(
  name: string,
): MetricWidgetDefinition {
  return {
    id: createLayoutId("widget"),
    name,
    layout: {
      ...ensureContainerRoot(createEmptyLayout(1)),
      showActions: true,
    },
  };
}
