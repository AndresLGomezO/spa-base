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

const glowOverlayLayout: UiLayoutDocument = ensureContainerRoot({
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
                { property: "position", value: "relative" },
                { property: "overflowX", value: "hidden" },
                { property: "overflowY", value: "hidden" },
              ],
              rows: [
                {
                  type: "component",
                  id: "row-income-card-glow",
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
                        value: "var(--gradient-card-glow-success)",
                      },
                      { property: "pointerEvents", value: "none" },
                      { property: "zIndex", value: "0" },
                    ],
                    rows: [],
                  },
                },
                {
                  type: "component",
                  id: "row-title",
                  component: {
                    kind: "text",
                    primary: { type: "static", value: "Income" },
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

describe("card glow overlay rows", () => {
  it("renders glow overlay out of document flow without flex stretch shell", () => {
    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer
        layout={glowOverlayLayout}
        context={minimalContext}
      />,
    );

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("position:absolute");
    expect(html).toMatch(
      /background(?:-color)?:(?:var\(--gradient-card-glow-success\)|linear-gradient)/,
    );
    expect(html).not.toContain(
      "flex min-h-0 flex-1 h-full w-full min-w-0 flex-col",
    );
  });
});
