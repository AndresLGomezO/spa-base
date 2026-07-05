import { describe, expect, it } from "vitest";
import type { MetricWidgetDefinition } from "@repo/entities";

import {
  INCOME_CHART_ROW_ID,
  injectMetricWidgetChartRefs,
  TOTAL_BALANCE_CHART_ROW_ID,
} from "./resolve-metric-widget-chart-refs.js";

function chartPrimaryValue(
  widgets: ReturnType<typeof injectMetricWidgetChartRefs>,
  rowId: string,
): string | undefined {
  const layout = widgets?.[0]?.layout as {
    root?: {
      columns?: Array<{
        rows?: Array<{
          id?: string;
          component?: { primary?: { value?: string } };
        }>;
      }>;
    };
  };
  const rows = layout?.root?.columns?.[0]?.rows ?? [];
  return rows.find((row) => row.id === rowId)?.component?.primary?.value;
}

describe("injectMetricWidgetChartRefs", () => {
  it("replaces chart image static values by row id", () => {
    const metricWidgets: MetricWidgetDefinition[] = [
      {
        id: "demo",
        name: "Demo",
        layout: {
          root: {
            type: "root",
            id: "widget-root",
            columnCount: 1,
            columns: [
              {
                id: "col-root",
                rows: [
                  {
                    type: "component",
                    id: TOTAL_BALANCE_CHART_ROW_ID,
                    component: {
                      kind: "image",
                      primary: { type: "static", value: "/fallback-a.svg" },
                    },
                  },
                  {
                    type: "component",
                    id: INCOME_CHART_ROW_ID,
                    component: {
                      kind: "image",
                      primary: { type: "static", value: "/fallback-b.svg" },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    ];

    const injected = injectMetricWidgetChartRefs(
      metricWidgets,
      new Map([
        [TOTAL_BALANCE_CHART_ROW_ID, "https://example/chart-a.png"],
        [INCOME_CHART_ROW_ID, "https://example/chart-b.png"],
      ]),
    );

    expect(chartPrimaryValue(injected, TOTAL_BALANCE_CHART_ROW_ID)).toBe(
      "https://example/chart-a.png",
    );
    expect(chartPrimaryValue(injected, INCOME_CHART_ROW_ID)).toBe(
      "https://example/chart-b.png",
    );
  });
});
