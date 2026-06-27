/** @vitest-environment jsdom */

import {
  ensureContainerRoot,
  type MetricWidgetComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { EmbeddedLayoutRenderer } from "./EmbeddedLayoutRenderer.js";
import { LayoutRenderOptionsProvider } from "../layout-render-options-context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const listItemContext: LayoutRenderContext = {
  mode: "listItem",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

const userWidgetLayout: UiLayoutDocument = {
  showActions: true,
  root: {
    type: "root",
    id: "root-doc",
    columnCount: 1,
    columns: [
      {
        id: "col-1",
        rows: [
          {
            type: "component",
            id: "row-root-container",
            component: {
              kind: "container",
              stackDirection: "column",
              styles: [
                { property: "minHeight", value: "200" },
                { property: "minWidth", value: "350" },
              ],
              rows: [
                {
                  type: "component",
                  id: "row-content",
                  component: {
                    kind: "container",
                    stackDirection: "column",
                    styles: [{ property: "height", value: "100%" }],
                    rows: [
                      {
                        type: "component",
                        id: "row-first",
                        component: {
                          kind: "container",
                          styles: [{ property: "height", value: "60%" }],
                          rows: [],
                        },
                      },
                      {
                        type: "component",
                        id: "row-second",
                        component: {
                          kind: "container",
                          styles: [{ property: "height", value: "10%" }],
                          rows: [],
                        },
                      },
                      {
                        type: "component",
                        id: "row-third",
                        component: {
                          kind: "container",
                          styles: [{ property: "height", value: "30%" }],
                          rows: [],
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
};

function createDashboardLayoutWithWidget(): UiLayoutDocument {
  return ensureContainerRoot({
    showActions: true,
    root: {
      type: "root",
      id: "root-dashboard",
      columnCount: 1,
      columns: [
        {
          id: "col-dashboard",
          rows: [
            {
              type: "component",
              id: "row-widget",
              component: {
                kind: "metric-widget",
                entityName: "transaction",
                widgetId: "widget-1",
              } satisfies MetricWidgetComponentConfig,
            },
          ],
        },
      ],
    },
  });
}

function extractLayoutGeometry(html: string): string[] {
  const tokens = new Set<string>();

  for (const match of html.matchAll(/style="([^"]*)"/g)) {
    const style = match[1] ?? "";

    for (const flexMatch of style.matchAll(/flex:0 0 [^;]+/g)) {
      tokens.add(flexMatch[0]!);
    }

    if (style.includes("height:200px") || style.includes("min-height:200px")) {
      tokens.add("root-height-200");
    }

    if (style.includes("height:100%")) {
      tokens.add("fill-height-100");
    }
  }

  return [...tokens].sort();
}

describe("RecursiveLayoutRenderer embedded layout parity", () => {
  it("matches direct widget layout geometry when embedded via metric-widget", () => {
    const direct = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={userWidgetLayout}
        context={listItemContext}
      />,
    );

    const embedded = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={createDashboardLayoutWithWidget()}
        context={{
          ...listItemContext,
          metricWidgetRenderer: () => (
            <EmbeddedLayoutRenderer
              layout={userWidgetLayout}
              context={listItemContext}
              shellClassName="h-auto min-h-0 min-w-0 max-w-full w-full"
            />
          ),
        }}
      />,
    );

    expect(extractLayoutGeometry(embedded)).toEqual(
      extractLayoutGeometry(direct),
    );
  });

  it("inherits designer render options into embedded layouts", () => {
    const html = renderToStaticMarkup(
      <LayoutRenderOptionsProvider value={{ stretchRootColumns: true }}>
        <RecursiveLayoutRenderer
          layout={createDashboardLayoutWithWidget()}
          context={{
            ...listItemContext,
            metricWidgetRenderer: () => (
              <EmbeddedLayoutRenderer
                layout={userWidgetLayout}
                context={listItemContext}
                shellClassName="h-full min-h-0 min-w-0 w-full"
              />
            ),
          }}
          stretchRootColumns
        />
      </LayoutRenderOptionsProvider>,
    );

    expect(html).toContain("flex:0 0 60%");
    expect(html).toContain("height:200px");
  });

  it("matches partial percent-split geometry when embedded via metric-widget", () => {
    const partialSplitLayout: UiLayoutDocument = {
      showActions: true,
      root: {
        type: "root",
        id: "root-doc",
        columnCount: 1,
        columns: [
          {
            id: "col-1",
            rows: [
              {
                type: "component",
                id: "row-root-container",
                component: {
                  kind: "container",
                  stackDirection: "column",
                  styles: [{ property: "minHeight", value: "200" }],
                  rows: [
                    {
                      type: "component",
                      id: "row-content",
                      component: {
                        kind: "container",
                        stackDirection: "column",
                        styles: [{ property: "height", value: "100%" }],
                        rows: [
                          {
                            type: "component",
                            id: "row-first",
                            component: { kind: "container", rows: [] },
                          },
                          {
                            type: "component",
                            id: "row-second",
                            component: { kind: "container", rows: [] },
                          },
                          {
                            type: "component",
                            id: "row-third",
                            component: {
                              kind: "container",
                              styles: [{ property: "height", value: "30%" }],
                              rows: [],
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
    };

    const direct = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={partialSplitLayout}
        context={listItemContext}
      />,
    );

    const embedded = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={createDashboardLayoutWithWidget()}
        context={{
          ...listItemContext,
          metricWidgetRenderer: () => (
            <EmbeddedLayoutRenderer
              layout={partialSplitLayout}
              context={listItemContext}
              shellClassName="h-auto min-h-0 min-w-0 max-w-full w-full"
            />
          ),
        }}
      />,
    );

    expect(extractLayoutGeometry(embedded)).toEqual(
      extractLayoutGeometry(direct),
    );
  });
});
