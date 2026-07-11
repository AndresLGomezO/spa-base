/** @vitest-environment jsdom */

import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
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
            id: "row-b1f5da52-cfee-47e9-bd5c-27da8f9d47f8",
            component: {
              kind: "container",
              stackDirection: "column",
              styles: [
                { property: "minHeight", value: "200" },
                { property: "minWidth", value: "350" },
                { property: "maxWidth", value: "450" },
              ],
              rows: [
                {
                  type: "component",
                  id: "row-9a50c012-b04b-4d16-9d9a-75c203aa3f3c",
                  component: {
                    kind: "container",
                    stackDirection: "column",
                    styles: [
                      { property: "height", value: "100%" },
                      { property: "padding", value: "var(--spacing-macro)" },
                    ],
                    rows: [
                      {
                        type: "component",
                        id: "row-first",
                        component: {
                          kind: "container",
                          stackDirection: "row",
                          styles: [
                            { property: "height", value: "60%" },
                            { property: "backgroundColor", value: "#000000" },
                          ],
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
                          stackDirection: "row",
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

describe("RecursiveLayoutRenderer widget percentage heights", () => {
  it("promotes root minHeight to height and stretches fill container inner stacks", () => {
    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={userWidgetLayout}
        context={listItemContext}
        stretchRootColumns
      />,
    );

    expect(html).toContain("height:200px");
    expect(html).toContain("min-height:200px");
    expect(html).toContain("height:100%");
    expect(html).toContain(
      'class="flex min-w-0 w-full min-h-0 flex-1 h-full overflow-hidden flex-col"',
    );
    expect(html).toContain("flex:0 0 60%");
    expect(html).toContain("flex:0 0 10%");
    expect(html).toContain("flex:0 0 30%");
    expect(html).not.toContain('style="height:60%');
  });

  it("promotes root minHeight and applies percent splits without stretchRootColumns", () => {
    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={userWidgetLayout}
        context={listItemContext}
      />,
    );

    expect(html).toContain("height:200px");
    expect(html).toContain("min-height:200px");
    expect(html).toContain("height:100%");
    expect(html).toContain("flex:0 0 60%");
    expect(html).toContain("flex:0 0 10%");
    expect(html).toContain("flex:0 0 30%");
    expect(html).not.toContain('style="height:60%');
  });

  it("applies flex split on row chrome shells when rowWrapper is used", () => {
    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={userWidgetLayout}
        context={listItemContext}
        stretchRootColumns
        rowWrapper={(row, _locator, children) => (
          <div
            data-row-id={row.id}
            className="relative flex min-h-0 h-full w-full min-w-0 shrink-0 flex-col"
            style={
              row.type === "component" &&
              row.component.kind === "container" &&
              row.component.styles?.some(
                (rule) =>
                  rule.property === "height" && String(rule.value) === "60%",
              )
                ? { flex: "0 0 60%", minHeight: 0 }
                : row.type === "component" &&
                    row.component.kind === "container" &&
                    row.component.styles?.some(
                      (rule) =>
                        rule.property === "height" &&
                        String(rule.value) === "10%",
                    )
                  ? { flex: "0 0 10%", minHeight: 0 }
                  : row.type === "component" &&
                      row.component.kind === "container" &&
                      row.component.styles?.some(
                        (rule) =>
                          rule.property === "height" &&
                          String(rule.value) === "30%",
                      )
                    ? { flex: "0 0 30%", minHeight: 0 }
                    : undefined
            }
          >
            <div className="relative z-0 flex h-full min-h-0 w-full min-w-0 flex-col">
              {children}
            </div>
          </div>
        )}
      />,
    );

    expect(html).toMatch(
      /data-row-id="row-first"[^>]*style="flex:0 0 60%;min-height:0"/,
    );
    expect(html).toMatch(
      /data-row-id="row-second"[^>]*style="flex:0 0 10%;min-height:0"/,
    );
    expect(html).toMatch(
      /data-row-id="row-third"[^>]*style="flex:0 0 30%;min-height:0"/,
    );
    expect(html).toContain("background-color:#000000");
    expect(html).toContain("height:100%");
  });

  it("applies flex-1 to non-split siblings when only one row has a percent height", () => {
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
                            component: {
                              kind: "container",
                              rows: [],
                            },
                          },
                          {
                            type: "component",
                            id: "row-second",
                            component: {
                              kind: "container",
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

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={partialSplitLayout}
        context={listItemContext}
      />,
    );

    expect(html).toContain("flex:0 0 30%");
    expect(html.match(/\bflex-1\b/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps fill-height containers adjacent to preview chrome inner without an extra wrapper", () => {
    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={userWidgetLayout}
        context={listItemContext}
        className="min-h-full flex-1"
        rowWrapper={(row, _locator, children) => (
          <div
            data-row-id={row.id}
            className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col"
          >
            <div className="relative z-0 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col z-10">
              {children}
            </div>
          </div>
        )}
      />,
    );

    expect(html).toMatch(
      /data-row-id="row-9a50c012-b04b-4d16-9d9a-75c203aa3f3c"[^>]*><div class="[^"]*\bz-10\b[^"]*"><div(?=[^>]*\bclass="[^"]*\bflex-1\b)(?=[^>]*\bh-full\b)[^>]*style="[^"]*height:100%/,
    );
    expect(html).not.toMatch(
      /data-row-id="row-9a50c012-b04b-4d16-9d9a-75c203aa3f3c"[^>]*><div class="[^"]*\bz-10\b[^"]*"><div><div class="[^"]*\bflex-1\b/,
    );
  });
});
