import { describe, expect, it, vi } from "vitest";

import {
  createMetricWidgetRenderer,
  UNIFIED_HOME_INSIGHTS_WIDGET_ID,
} from "./create-metric-widget-renderer";

vi.mock("../insights/UnifiedInsightsCard", () => ({
  UnifiedInsightsCard: (props: {
    readonly config: { readonly widgetId: string };
  }) => <div data-testid="unified-insights-host">{props.config.widgetId}</div>,
}));

vi.mock("./MetricWidgetSlot.js", () => ({
  MetricWidgetSlot: () => <div data-testid="metric-widget-slot" />,
}));

describe("createMetricWidgetRenderer", () => {
  it("hosts unified-home-insights with UnifiedInsightsCard", () => {
    const renderer = createMetricWidgetRenderer({
      buildLayoutContext: () => {
        throw new Error("should not build layout for hosted insights widget");
      },
      dashboardDateFilter: {
        value: "2026-06",
        granularity: "month",
        param: "period",
      },
    });

    const node = renderer({
      kind: "metric-widget",
      entityName: "paymentSchedule",
      widgetId: UNIFIED_HOME_INSIGHTS_WIDGET_ID,
    });

    expect(node).toMatchObject({
      type: expect.any(Function),
      props: {
        config: {
          widgetId: UNIFIED_HOME_INSIGHTS_WIDGET_ID,
        },
      },
    });
  });

  it("falls through to MetricWidgetSlot for normal widgets", () => {
    const renderer = createMetricWidgetRenderer({
      buildLayoutContext: () => {
        throw new Error("unused");
      },
    });

    const node = renderer({
      kind: "metric-widget",
      entityName: "paymentSchedule",
      widgetId: "upcoming-payments-dashboard",
    });

    expect(node).toMatchObject({
      type: expect.any(Function),
      props: {
        config: {
          widgetId: "upcoming-payments-dashboard",
        },
      },
    });
  });
});
