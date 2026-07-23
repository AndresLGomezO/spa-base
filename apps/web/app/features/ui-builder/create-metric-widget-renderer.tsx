import type { MetricWidgetComponentConfig } from "@repo/ui-builder-core";

import {
  MetricWidgetSlot,
  type MetricWidgetBuildLayoutContext,
} from "./MetricWidgetSlot.js";

interface CreateMetricWidgetRendererOptions {
  readonly buildLayoutContext: MetricWidgetBuildLayoutContext;
}

export function createMetricWidgetRenderer(
  options: CreateMetricWidgetRendererOptions,
) {
  const { buildLayoutContext } = options;

  return (config: MetricWidgetComponentConfig) => (
    <MetricWidgetSlot config={config} buildLayoutContext={buildLayoutContext} />
  );
}
