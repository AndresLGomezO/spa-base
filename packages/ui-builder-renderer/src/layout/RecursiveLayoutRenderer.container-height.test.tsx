/** @vitest-environment jsdom */

import {
  createLayoutId,
  ensureContainerRoot,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
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

function layoutWithRootContainerHeight(
  rootHeight: string,
  innerHeight?: string,
): UiLayoutDocument {
  const innerContainerId = createLayoutId("inner-container");
  const layout = ensureContainerRoot({
    showActions: true,
    root: {
      type: "root",
      id: createLayoutId("root"),
      columnCount: 1,
      columns: [
        {
          id: createLayoutId("col"),
          rows: [
            {
              type: "component",
              id: createLayoutId("root-container"),
              component: {
                kind: "container",
                stackDirection: "column",
                styles: [{ property: "height", value: rootHeight }],
                rows: innerHeight
                  ? [
                      {
                        type: "component",
                        id: innerContainerId,
                        component: {
                          kind: "container",
                          stackDirection: "column",
                          styles: [{ property: "height", value: innerHeight }],
                          rows: [
                            {
                              type: "component",
                              id: createLayoutId("text"),
                              component: {
                                kind: "text",
                                primary: {
                                  type: "static",
                                  value: "Hello",
                                },
                              },
                            },
                          ],
                        },
                      },
                    ]
                  : [],
              },
            },
          ],
        },
      ],
    },
  });

  return layout;
}

describe("RecursiveLayoutRenderer container explicit height", () => {
  it("does not apply stretch classes to root containers with explicit height", () => {
    const layout = layoutWithRootContainerHeight("200");

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={listItemContext}
        stretchRootColumns
      />,
    );

    expect(html).toContain('style="height:200px"');
    expect(html).not.toMatch(
      /style="height:200px"[^>]*class="[^"]*\bflex-1\b[^"]*\bh-full\b/,
    );
  });

  it("still applies stretch classes to root containers without explicit height", () => {
    const layout = ensureContainerRoot({
      showActions: true,
      root: {
        type: "root",
        id: createLayoutId("root"),
        columnCount: 1,
        columns: [
          {
            id: createLayoutId("col"),
            rows: [
              {
                type: "component",
                id: createLayoutId("root-container"),
                component: {
                  kind: "container",
                  rows: [],
                },
              },
            ],
          },
        ],
      },
    });

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={listItemContext}
        stretchRootColumns
      />,
    );

    expect(html).toMatch(/\bflex-1\b/);
    expect(html).toMatch(/\bh-full\b/);
  });

  it("applies explicit root height for percentage-height child containers", () => {
    const layout = layoutWithRootContainerHeight("200", "100%");

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={listItemContext}
        stretchRootColumns
      />,
    );

    expect(html).toContain('style="height:200px"');
    expect(html).toContain('style="height:100%"');
    expect(html).toMatch(/flex h-full min-h-0 w-full min-w-0 flex-1 flex-col/);
  });

  it("uses shrink-0 for percentage split rows and fill stretch for minHeight 100%", () => {
    const layout = ensureContainerRoot({
      showActions: true,
      root: {
        type: "root",
        id: createLayoutId("root"),
        columnCount: 1,
        columns: [
          {
            id: createLayoutId("col"),
            rows: [
              {
                type: "component",
                id: createLayoutId("root-container"),
                component: {
                  kind: "container",
                  stackDirection: "column",
                  styles: [{ property: "height", value: "200" }],
                  rows: [
                    {
                      type: "component",
                      id: createLayoutId("content"),
                      component: {
                        kind: "container",
                        stackDirection: "column",
                        styles: [{ property: "minHeight", value: "100%" }],
                        rows: [
                          {
                            type: "component",
                            id: createLayoutId("row-1"),
                            component: {
                              kind: "container",
                              rows: [],
                              styles: [{ property: "minHeight", value: "60%" }],
                            },
                          },
                          {
                            type: "component",
                            id: createLayoutId("row-2"),
                            component: {
                              kind: "container",
                              rows: [],
                              styles: [{ property: "minHeight", value: "10%" }],
                            },
                          },
                          {
                            type: "component",
                            id: createLayoutId("row-3"),
                            component: {
                              kind: "container",
                              rows: [],
                              styles: [{ property: "minHeight", value: "30%" }],
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

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={listItemContext}
        stretchRootColumns
      />,
    );

    expect(html).toContain('style="min-height:100%"');
    expect(html).toMatch(/flex h-full min-h-0 w-full min-w-0 flex-1 flex-col/);
    expect(html).toContain("flex:0 0 60%");
    expect(html).toContain("flex:0 0 10%");
    expect(html).toContain("flex:0 0 30%");
  });
});
