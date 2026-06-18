/** @vitest-environment jsdom */

import {
  ensureContainerRoot,
  type DashboardSectionComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const sectionLayout: UiLayoutDocument = ensureContainerRoot({
  showActions: true,
  root: {
    type: "root",
    id: "root-section",
    columnCount: 1,
    columns: [
      {
        id: "col-section",
        rows: [
          {
            type: "component",
            id: "row-section-container",
            component: {
              kind: "container",
              styles: [{ property: "alignItems", value: "start" }],
              rows: [
                {
                  type: "component",
                  id: "row-greeting",
                  component: {
                    kind: "text",
                    primary: { type: "static", value: "Hello," },
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

function createDashboardLayout(sectionId: string): UiLayoutDocument {
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
              id: "row-dashboard-section",
              component: {
                kind: "dashboard-section",
                sectionId,
              } satisfies DashboardSectionComponentConfig,
            },
          ],
        },
      ],
    },
  });
}

function createContextWithoutSectionRenderer(): LayoutRenderContext {
  return {
    mode: "listItem",
    data: {},
    locale: "en",
    resolveField: () => undefined,
  };
}

describe("RecursiveLayoutRenderer dashboard-section", () => {
  it("renders static text from an embedded section under stretchRootColumns", () => {
    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={createDashboardLayout("section-1")}
        context={{
          mode: "listItem",
          data: {},
          locale: "en",
          resolveField: () => undefined,
          dashboardSectionRenderer: () => (
            <div className="min-w-0 w-full">
              <RecursiveLayoutRenderer
                layout={sectionLayout}
                context={createContextWithoutSectionRenderer()}
              />
            </div>
          ),
        }}
        stretchRootColumns
      />,
    );

    expect(markup).toContain("Hello,");
    expect(markup).toContain("shrink-0");
    expect(markup).toContain("basis-auto");
  });

  it("applies flex grow on dashboard-section rows in horizontal stacks", () => {
    const layout = ensureContainerRoot({
      showActions: true,
      root: {
        type: "root",
        id: "root-dashboard",
        columnCount: 1,
        columns: [
          {
            id: "col-dashboard",
            stackDirection: "row",
            rows: [
              {
                type: "component",
                id: "row-calendar",
                component: {
                  kind: "dashboard-section",
                  sectionId: "section-calendar",
                  styles: [{ property: "flex", value: "1" }],
                },
              },
              {
                type: "component",
                id: "row-greeting",
                component: {
                  kind: "dashboard-section",
                  sectionId: "section-greeting",
                  styles: [{ property: "alignSelf", value: "end" }],
                },
              },
            ],
          },
        ],
      },
    });

    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={{
          mode: "listItem",
          data: {},
          locale: "en",
          resolveField: () => undefined,
          dashboardSectionRenderer: () => (
            <div className="h-auto min-w-0 w-full">Section</div>
          ),
        }}
      />,
    );

    expect(markup).toContain("flex-[1]");
    expect(markup).toContain("mt-auto");
    expect(markup).not.toMatch(/flex-\[1\][^"]*shrink-0/);
  });

  it("applies flex grow inside container nested horizontal stacks", () => {
    const layout = ensureContainerRoot({
      showActions: true,
      root: {
        type: "root",
        id: "root-home",
        columnCount: 1,
        columns: [
          {
            id: "col-home",
            rows: [
              {
                type: "component",
                id: "row-container",
                component: {
                  kind: "container",
                  styles: [{ property: "gap", value: "10" }],
                  rows: [
                    {
                      type: "nested-layout",
                      id: "nested-calendar-greeting",
                      columnCount: 1,
                      columns: [
                        {
                          id: "col-calendar-greeting",
                          stackDirection: "row",
                          styles: [
                            { property: "gap", value: "20" },
                            { property: "alignItems", value: "end" },
                          ],
                          rows: [
                            {
                              type: "component",
                              id: "row-calendar",
                              component: {
                                kind: "dashboard-section",
                                sectionId: "section-calendar",
                                styles: [{ property: "flex", value: "1" }],
                              },
                            },
                            {
                              type: "component",
                              id: "row-greeting",
                              component: {
                                kind: "dashboard-section",
                                sectionId: "section-greeting",
                                styles: [
                                  { property: "alignSelf", value: "end" },
                                ],
                              },
                            },
                          ],
                        },
                      ],
                      styles: [],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    });

    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={{
          mode: "listItem",
          data: {},
          locale: "en",
          resolveField: () => undefined,
          dashboardSectionRenderer: () => (
            <div className="h-auto min-w-0 w-full">Section</div>
          ),
        }}
      />,
    );

    expect(markup).toContain("flex-[1]");
    expect(markup).toContain("self-end");
    expect(markup).toContain("items-end");
  });

  it("stretches flex-grow text rows to full width in column stacks for textAlign", () => {
    const layout = ensureContainerRoot({
      showActions: true,
      root: {
        type: "root",
        id: "root-calendar-text",
        columnCount: 1,
        columns: [
          {
            id: "col-calendar-text",
            rows: [
              {
                type: "component",
                id: "row-calendar-column",
                component: {
                  kind: "container",
                  stackDirection: "column",
                  styles: [
                    { property: "alignItems", value: "start" },
                    { property: "minWidth", value: "140" },
                  ],
                  rows: [
                    {
                      type: "component",
                      id: "row-monday",
                      component: {
                        kind: "text",
                        primary: { type: "static", value: "Monday" },
                        styles: [
                          { property: "flex", value: "1" },
                          { property: "textAlign", value: "center" },
                        ],
                      },
                    },
                    {
                      type: "component",
                      id: "row-day-number",
                      component: {
                        kind: "text",
                        primary: { type: "static", value: "12" },
                        styles: [
                          { property: "flex", value: "1" },
                          { property: "textAlign", value: "center" },
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

    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={{
          mode: "listItem",
          data: {},
          locale: "en",
          resolveField: () => undefined,
        }}
      />,
    );

    expect(markup).toContain("flex-[1]");
    expect(markup).toMatch(
      /w-full min-w-0[^"]*flex-\[1\]|flex-\[1\][^"]*w-full min-w-0/,
    );
    expect(markup).toContain("self-stretch");
    expect(markup).toContain("text-center");
  });

  it("uses content-width shell for flex-zero dashboard sections", () => {
    const layout = ensureContainerRoot({
      showActions: true,
      root: {
        type: "root",
        id: "root-dashboard-shell",
        columnCount: 1,
        columns: [
          {
            id: "col-dashboard-shell",
            stackDirection: "row",
            styles: [{ property: "flexWrap", value: "wrap" }],
            rows: [
              {
                type: "component",
                id: "row-calendar-section",
                component: {
                  kind: "dashboard-section",
                  sectionId: "section-calendar",
                  styles: [{ property: "flex", value: "0" }],
                },
              },
            ],
          },
        ],
      },
    });

    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={{
          mode: "listItem",
          data: {},
          locale: "en",
          resolveField: () => undefined,
          dashboardSectionRenderer: () => (
            <div className="h-auto min-w-0 w-fit max-w-full">Section</div>
          ),
        }}
      />,
    );

    expect(markup).toContain("w-fit max-w-full");
  });

  it("bottom-aligns image rows inside row-stacked containers", () => {
    const layout = ensureContainerRoot({
      showActions: true,
      root: {
        type: "root",
        id: "root-widget",
        columnCount: 1,
        columns: [
          {
            id: "col-widget",
            rows: [
              {
                type: "component",
                id: "row-card",
                component: {
                  kind: "container",
                  stackDirection: "row",
                  rows: [
                    {
                      type: "component",
                      id: "row-copy",
                      component: {
                        kind: "container",
                        rows: [
                          {
                            type: "component",
                            id: "row-label",
                            component: {
                              kind: "text",
                              primary: {
                                type: "static",
                                value: "Total balance",
                              },
                            },
                          },
                          {
                            type: "component",
                            id: "row-value",
                            component: {
                              kind: "text",
                              primary: { type: "static", value: "$1,234" },
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "component",
                      id: "row-image-shell",
                      component: {
                        kind: "container",
                        styles: [
                          { property: "alignItems", value: "start" },
                          { property: "justifyContent", value: "center" },
                        ],
                        rows: [
                          {
                            type: "component",
                            id: "row-image",
                            component: {
                              kind: "image",
                              primary: {
                                type: "static",
                                value: "https://example.com/logo.png",
                              },
                              styles: [{ property: "alignSelf", value: "end" }],
                              imageSize: 120,
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

    const markup = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={{
          mode: "listItem",
          data: {},
          locale: "en",
          resolveField: () => undefined,
        }}
      />,
    );

    expect(markup).toContain("self-stretch");
    expect(markup).toContain("justify-center");
    expect(markup).toContain("mt-auto");
    expect(markup).not.toContain("self-end");
  });
});
