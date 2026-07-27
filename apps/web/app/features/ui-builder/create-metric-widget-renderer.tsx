import type { MetricWidgetComponentConfig } from "@repo/ui-builder-core";
import type { ReactNode } from "react";

import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";
import { UnifiedInsightsCard } from "../insights/UnifiedInsightsCard";
import {
  MetricWidgetSlot,
  type MetricWidgetBuildLayoutContext,
} from "./MetricWidgetSlot.js";

/** Tenant widget ids hosted by React (not EmbeddedLayoutRenderer). */
export const UNIFIED_HOME_INSIGHTS_WIDGET_ID = "unified-home-insights";

interface CreateMetricWidgetRendererOptions {
  readonly buildLayoutContext: MetricWidgetBuildLayoutContext;
  readonly dashboardDateFilter?: DashboardDateFilterContextValue;
}

export function createMetricWidgetRenderer(
  options: CreateMetricWidgetRendererOptions,
) {
  const { buildLayoutContext, dashboardDateFilter } = options;

  return (config: MetricWidgetComponentConfig): ReactNode => {
    if (config.widgetId === UNIFIED_HOME_INSIGHTS_WIDGET_ID) {
      return (
        <UnifiedInsightsCard
          config={config}
          dashboardDateFilter={dashboardDateFilter}
        />
      );
    }

    return (
      <MetricWidgetSlot
        config={config}
        buildLayoutContext={buildLayoutContext}
      />
    );
  };
}
