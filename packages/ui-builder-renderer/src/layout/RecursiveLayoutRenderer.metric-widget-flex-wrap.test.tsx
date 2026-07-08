/** @vitest-environment jsdom */

import {
  ensureContainerRoot,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

function createMetricWidgetStripLayout(): UiLayoutDocument {
  return ensureContainerRoot({
    showActions: true,
    root: {
      type: "root",
      id: "root-metrics-strip",
      columnCount: 1,
      columns: [
        {
          id: "col-metrics-strip",
          rows: [
            {
              type: "component",
              id: "row-metrics-strip",
              component: {
                kind: "container",
                stackDirection: "row",
                styles: [
                  { property: "flexWrap", value: "wrap" },
                  { property: "gap", value: "16" },
                  { property: "alignItems", value: "start" },
                  { property: "justifyContent", value: "start" },
                ],
                rows: [
                  {
                    type: "component",
                    id: "row-widget-1",
                    component: {
                      kind: "metric-widget",
                      entityName: "transaction",
                      widgetId: "widget-1",
                      styles: [{ property: "flex", value: "0" }],
                    },
                  },
                  {
                    type: "component",
                    id: "row-widget-2",
                    component: {
                      kind: "metric-widget",
                      entityName: "transaction",
                      widgetId: "widget-2",
                      styles: [{ property: "flex", value: "0" }],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  });
}

const context: LayoutRenderContext = {
  mode: "listItem",
  data: {},
  locale: "en",
  resolveField: () => undefined,
  metricWidgetRenderer: () => (
    <div className="metric-widget-card" style={{ width: 260, height: 200 }}>
      Widget
    </div>
  ),
};

function createNestedMetricGroupWrapLayout(): UiLayoutDocument {
  return ensureContainerRoot({
    showActions: true,
    root: {
      type: "root",
      id: "root-metrics-group",
      columnCount: 1,
      columns: [
        {
          id: "col-metrics-group",
          rows: [
            {
              type: "component",
              id: "row-metrics-group",
              component: {
                kind: "container",
                stackDirection: "row",
                styles: [
                  { property: "flexWrap", value: "wrap" },
                  { property: "gap", value: "16" },
                ],
                rows: [
                  {
                    type: "component",
                    id: "row-balance",
                    component: {
                      kind: "metric-widget",
                      entityName: "account",
                      widgetId: "total-balance-by-month",
                      styles: [
                        { property: "minWidth", value: "400" },
                        { property: "maxWidth", value: "450" },
                      ],
                    },
                  },
                  {
                    type: "component",
                    id: "row-kpi-group",
                    component: {
                      kind: "container",
                      stackDirection: "row",
                      styles: [
                        { property: "minWidth", value: "500" },
                        { property: "maxWidth", value: "600" },
                        { property: "gap", value: "8" },
                      ],
                      rows: [
                        {
                          type: "component",
                          id: "row-income",
                          component: {
                            kind: "metric-widget",
                            entityName: "account",
                            widgetId: "income-by-month",
                            styles: [{ property: "minWidth", value: "170" }],
                          },
                        },
                        {
                          type: "component",
                          id: "row-expenses",
                          component: {
                            kind: "metric-widget",
                            entityName: "account",
                            widgetId: "expenses-by-month",
                            styles: [{ property: "minWidth", value: "170" }],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  });
}

describe("RecursiveLayoutRenderer metric-widget flex wrap", () => {
  it("lays out metric-widget rows side-by-side with intrinsic width in flex-wrap containers", () => {
    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={createMetricWidgetStripLayout()}
        context={context}
      />,
    );

    expect(markup).toContain("flex-wrap");
    expect(markup).toContain("flex-row");
    expect(markup).toContain("basis-auto");
    expect(markup).toContain("w-fit");
    expect(markup).not.toContain("flex-[0]");
    expect(markup.match(/metric-widget-card/g)?.length).toBe(2);
  });

  it("keeps nested metric groups content-sized so wrap uses group minWidth, not basis-0", () => {
    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={createNestedMetricGroupWrapLayout()}
        context={context}
      />,
    );

    expect(markup).toContain("flex-wrap");
    expect(markup).toContain("min-width:500px");
    expect(markup).toContain("flex-[1_1_auto]");
    expect(markup).toContain("basis-auto");
    expect(markup).not.toContain("flex-[1_1_0]");
    expect(markup).not.toContain("basis-0");
    expect(markup.match(/metric-widget-card/g)?.length).toBe(3);
  });
});
