/** @vitest-environment jsdom */

import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const gridLayout: UiLayoutDocument = {
  root: {
    type: "root",
    id: "root-grid",
    columnCount: 1,
    columns: [
      {
        id: "col-grid",
        rows: [
          {
            type: "component",
            id: "row-metrics-grid",
            component: {
              kind: "grid",
              gridTemplateColumns: "minmax(500px, 600px) repeat(3, 200px)",
              gap: "16px",
              rows: [
                {
                  type: "component",
                  id: "track-1",
                  component: {
                    kind: "text",
                    primary: { type: "static", value: "Track 1" },
                  },
                },
                {
                  type: "component",
                  id: "track-2",
                  component: {
                    kind: "text",
                    primary: { type: "static", value: "Track 2" },
                  },
                },
                {
                  type: "component",
                  id: "track-3",
                  component: {
                    kind: "text",
                    primary: { type: "static", value: "Track 3" },
                  },
                },
                {
                  type: "component",
                  id: "track-4",
                  component: {
                    kind: "text",
                    primary: { type: "static", value: "Track 4" },
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

const context: LayoutRenderContext = {
  mode: "mainPage",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

describe("RecursiveLayoutRenderer grid tracks", () => {
  it("renders each grid track as a direct horizontal grid child", () => {
    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer layout={gridLayout} context={context} />,
    );

    expect(html).toContain(
      "grid-template-columns:minmax(500px, 600px) 200px 200px 200px",
    );
    expect(html).toContain("gap:16px");
    expect(html).toContain("Track 1");
    expect(html).toContain("Track 4");
    expect(html).not.toMatch(
      /display:grid[^>]*>[^<]*<div[^>]*class="[^"]*flex-col/,
    );
  });

  it("normalizes unitless grid gap values to pixels", () => {
    const layout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "root-grid-gap",
        columnCount: 1,
        columns: [
          {
            id: "col-grid-gap",
            rows: [
              {
                type: "component",
                id: "row-grid-gap",
                component: {
                  kind: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "24",
                  rows: [
                    {
                      type: "component",
                      id: "track-a",
                      component: {
                        kind: "text",
                        primary: { type: "static", value: "A" },
                      },
                    },
                    {
                      type: "component",
                      id: "track-b",
                      component: {
                        kind: "text",
                        primary: { type: "static", value: "B" },
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
      <RecursiveLayoutRenderer layout={layout} context={context} />,
    );

    expect(html).toContain("gap:24px");
  });

  it("prefers component.gap over gap style rules", () => {
    const layout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "root-grid-gap-precedence",
        columnCount: 1,
        columns: [
          {
            id: "col-grid-gap-precedence",
            rows: [
              {
                type: "component",
                id: "row-grid-gap-precedence",
                component: {
                  kind: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "32",
                  styles: [{ property: "gap", value: "20" }],
                  rows: [
                    {
                      type: "component",
                      id: "track-a",
                      component: {
                        kind: "text",
                        primary: { type: "static", value: "A" },
                      },
                    },
                    {
                      type: "component",
                      id: "track-b",
                      component: {
                        kind: "text",
                        primary: { type: "static", value: "B" },
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
      <RecursiveLayoutRenderer layout={layout} context={context} />,
    );

    expect(html).toContain("gap:32px");
    expect(html).not.toContain("gap:20px");
  });
});
