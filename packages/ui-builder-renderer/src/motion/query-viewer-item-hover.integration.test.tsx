/** @vitest-environment jsdom */

import {
  ensureContainerRoot,
  type ComponentRowNode,
  type MotionPreset,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { EmbeddedLayoutRenderer } from "../layout/EmbeddedLayoutRenderer.js";
import { resolveMotionPreset } from "./resolve-motion.js";

const minimalContext: LayoutRenderContext = {
  mode: "listItem",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

function rowsFromLayout(layout: UiLayoutDocument): ComponentRowNode[] {
  const root = layout.root;
  if (root.type !== "root") {
    throw new Error("expected legacy root");
  }
  const topRows = [...(root.columns[0]?.rows ?? [])] as ComponentRowNode[];
  const only = topRows[0];
  if (
    only?.type === "component" &&
    only.component.kind === "container" &&
    only.component.rows.length === 1 &&
    !only.motion
  ) {
    return [...only.component.rows] as ComponentRowNode[];
  }
  return topRows;
}

const paymentItemTemplateRows = rowsFromLayout(
  ensureContainerRoot({
    root: {
      type: "root",
      id: "tmp",
      columnCount: 1,
      columns: [
        {
          id: "col",
          rows: [
            {
              type: "component",
              id: "payment-item",
              motion: {
                hoverSurface: "glow-border",
                hoverTransform: "none",
                hoverDurationMs: 150,
                transition: "all",
              },
              component: {
                kind: "container",
                stackDirection: "row",
                styles: [],
                rows: [
                  {
                    type: "component",
                    id: "payment-label",
                    component: {
                      kind: "text",
                      primary: { type: "static", value: "Payment" },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  }),
);

const miniActionRow = rowsFromLayout(
  ensureContainerRoot({
    root: {
      type: "root",
      id: "tmp",
      columnCount: 1,
      columns: [
        {
          id: "col",
          rows: [
            {
              type: "component",
              id: "row-due-today-snapshot-mini-action",
              motion: {
                hoverSurface: "destructive",
                hoverTransform: "none",
                hoverDurationMs: 150,
                transition: "all",
              },
              component: {
                kind: "container",
                stackDirection: "row",
                styles: [
                  {
                    property: "backgroundColor",
                    value:
                      "color-mix(in oklch, var(--color-destructive) 24%, transparent)",
                  },
                  { property: "borderRadius", value: "12" },
                  { property: "paddingTop", value: "10" },
                  { property: "paddingBottom", value: "10" },
                  { property: "width", value: "100%" },
                ],
                rows: [
                  {
                    type: "component",
                    id: "row-due-today-snapshot-mini-action-label",
                    component: {
                      kind: "text",
                      primary: { type: "static", value: "Pay now" },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  }),
)[0]!;

const seeAllRow = rowsFromLayout(
  ensureContainerRoot({
    root: {
      type: "root",
      id: "tmp",
      columnCount: 1,
      columns: [
        {
          id: "col",
          rows: [
            {
              type: "component",
              id: "row-recent-activity-see-all",
              motion: {
                hoverSurface: "default",
                hoverTransform: "none",
                hoverDurationMs: 150,
                transition: "all",
              },
              styles: [
                { property: "paddingTop", value: "4" },
                { property: "paddingBottom", value: "4" },
                { property: "paddingLeft", value: "8" },
                { property: "paddingRight", value: "8" },
                { property: "borderRadius", value: "8" },
              ],
              component: {
                kind: "text",
                primary: { type: "static", value: "See all" },
                styles: [
                  { property: "color", value: "primary" },
                  { property: "fontSize", value: "14" },
                  { property: "fontWeight", value: "medium" },
                ],
              },
            },
          ],
        },
      ],
    },
  }),
)[0]!;

describe("query viewer item row hover", () => {
  it("preserves hoverSurface on the payment item template row and renders interactive hover", () => {
    const itemRow = paymentItemTemplateRows[0] as ComponentRowNode & {
      motion?: MotionPreset;
    };
    expect(itemRow.motion?.hoverSurface).toBe("glow-border");

    const motion = resolveMotionPreset(itemRow.motion);
    expect(motion.className).toContain("ui-motion-hover-interactive");
    expect(motion.className).toContain("ui-motion-hover-glow-border");

    const itemLayout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "query-viewer-item-root",
        columnCount: 1,
        columns: [
          {
            id: "query-viewer-item-col",
            rows: [...paymentItemTemplateRows],
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={itemLayout} context={minimalContext} />,
    );

    expect(html).toContain("ui-motion-hover-interactive");
    expect(html).toContain("ui-motion-hover-glow-border");
  });

  it("renders tinted mini-widget action buttons with rest/hover background vars", () => {
    expect(
      (miniActionRow as ComponentRowNode & { motion?: MotionPreset }).motion
        ?.hoverSurface,
    ).toBe("destructive");

    const actionLayout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "mini-action-root",
        columnCount: 1,
        columns: [
          {
            id: "mini-action-col",
            rows: [miniActionRow],
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={actionLayout} context={minimalContext} />,
    );

    expect(html).toContain("ui-motion-hover-interactive");
    expect(html).toContain("--motion-rest-bg");
    expect(html).toContain("--motion-hover-bg");
    expect(html).not.toMatch(/background-color:color-mix/);
  });

  it("renders See all text links with interactive hover on the row wrapper", () => {
    expect(
      (seeAllRow as ComponentRowNode & { motion?: MotionPreset }).motion
        ?.hoverSurface,
    ).toBe("default");

    const seeAllLayout: UiLayoutDocument = {
      root: {
        type: "root",
        id: "see-all-root",
        columnCount: 1,
        columns: [
          {
            id: "see-all-col",
            rows: [seeAllRow],
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      <EmbeddedLayoutRenderer layout={seeAllLayout} context={minimalContext} />,
    );

    expect(html).toContain("ui-motion-hover-interactive");
    expect(html).toContain("--motion-hover-bg");
    expect(html).toContain("padding-top:4px");
    expect(html).toContain("border-radius:8px");
  });
});
