/** @vitest-environment jsdom */

import {
  ensureContainerRoot,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { EmbeddedLayoutRenderer } from "./EmbeddedLayoutRenderer.js";

vi.mock("@visx/responsive", () => ({
  ParentSize: ({
    children,
  }: {
    readonly children: (size: {
      readonly width: number;
      readonly height: number;
    }) => unknown;
  }) => children({ width: 320, height: 160 }),
}));

const minimalContext: LayoutRenderContext = {
  mode: "listItem",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

const glassCardLayout: UiLayoutDocument = ensureContainerRoot({
  root: {
    type: "root",
    id: "root",
    columnCount: 1,
    columns: [
      {
        id: "col",
        rows: [
          {
            type: "component",
            id: "card",
            component: {
              kind: "container",
              stackDirection: "column",
              styles: [
                {
                  property: "backdropFilter",
                  value: "var(--backdrop-filter-card)",
                },
                { property: "backgroundColor", value: "var(--color-card)" },
                { property: "boxShadow", value: "var(--shadow-card)" },
                { property: "position", value: "relative" },
                { property: "overflowX", value: "hidden" },
                { property: "overflowY", value: "hidden" },
              ],
              rows: [
                {
                  type: "component",
                  id: "glow",
                  component: {
                    kind: "container",
                    stackDirection: "column",
                    styles: [
                      { property: "position", value: "absolute" },
                      { property: "top", value: "0" },
                      { property: "right", value: "0" },
                      { property: "bottom", value: "0" },
                      { property: "left", value: "0" },
                      {
                        property: "backgroundColor",
                        value: "var(--gradient-card-glow-neutral)",
                      },
                      { property: "pointerEvents", value: "none" },
                    ],
                    rows: [],
                  },
                },
                {
                  type: "component",
                  id: "title",
                  component: {
                    kind: "text",
                    primary: { type: "static", value: "Upcoming" },
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

describe("upcoming payments glass card", () => {
  it("renders glass surface styles on the card shell", () => {
    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer
        layout={glassCardLayout}
        context={minimalContext}
      />,
    );

    expect(html).toContain("backdrop-filter:var(--backdrop-filter-card)");
    expect(html).toContain("background-color:var(--color-card)");
    expect(html).toContain("box-shadow:var(--shadow-card)");
    expect(html).toMatch(
      /background(?:-color)?:var\(--gradient-card-glow-neutral\)/,
    );
  });
});
