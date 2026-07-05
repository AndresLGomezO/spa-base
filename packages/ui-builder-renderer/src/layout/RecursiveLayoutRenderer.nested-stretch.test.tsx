/** @vitest-environment jsdom */

import {
  createEmptyLayout,
  createLayoutId,
  ensureContainerRoot,
  insertGridRowAt,
  setGridTemplateColumns,
  setRootColumnWidthPercent,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext, WizardRenderState } from "../context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const wizardState: WizardRenderState = {
  steps: [{ id: "step-1", label: "Step 1" }],
  currentStepIndex: 0,
  stepStatuses: { "step-1": "active" },
};

const wizardContext: LayoutRenderContext = {
  mode: "form",
  data: {},
  locale: "en",
  resolveField: () => undefined,
  wizard: wizardState,
};

function createTwoTrackGridLayout(): UiLayoutDocument {
  const began = ensureContainerRoot(createEmptyLayout(1));
  const containerLocator = {
    scope: "root" as const,
    columnIndex: 0,
  };
  const { layout, rowId } = insertGridRowAt(
    began,
    containerLocator,
    { position: "after" },
    { trackCount: 2 },
  );
  return setGridTemplateColumns(layout, containerLocator, rowId, "24% 1fr");
}

describe("RecursiveLayoutRenderer grid layout stretch", () => {
  it("does not apply root fill classes to explicit inner grid template columns", () => {
    const withGrid = createTwoTrackGridLayout();

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={withGrid}
        context={wizardContext}
        stretchRootColumns
      />,
    );

    expect(html).toContain("grid-template-columns:24% 1fr");
    expect(html).not.toMatch(
      /grid-cols-1 sm:\[grid-template-columns:var\(--layout-proportional-cols\)\][^"]*\bflex-1\b/,
    );
  });

  it("does not apply root fill classes to proportional multi-column root grids", () => {
    let layout = createEmptyLayout(2);
    layout = setRootColumnWidthPercent(layout, 0, 24);

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={wizardContext}
        stretchRootColumns
      />,
    );

    const rootGridMatch = html.match(
      /grid w-full items-stretch[^"]*grid-cols-1 sm:\[grid-template-columns:var\(--layout-proportional-cols\)\]/,
    );

    expect(rootGridMatch).not.toBeNull();
    expect(rootGridMatch![0]).not.toMatch(/\bflex-1\b/);
    expect(rootGridMatch![0]).not.toMatch(/\bh-full\b/);
  });

  it("still applies root fill classes when root columns share space evenly", () => {
    let layout = createEmptyLayout(2);
    layout = setRootColumnWidthPercent(layout, 0, 24);

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={wizardContext}
        stretchRootColumns
      />,
    );

    expect(html).toMatch(/\bflex-1\b/);
    expect(html).toMatch(/\bh-full\b/);
  });

  it("stretches dashboard-style root container layouts for listItem surfaces", () => {
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
                id: createLayoutId("row"),
                component: {
                  kind: "grid",
                  gridTemplateColumns: "1fr",
                  rows: [
                    {
                      type: "component",
                      id: createLayoutId("row"),
                      component: { kind: "container", rows: [] },
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
        context={{
          mode: "listItem",
          data: {},
          locale: "en",
          resolveField: () => undefined,
        }}
        stretchRootColumns
      />,
    );

    expect(html).toMatch(/\bflex-1\b/);
    expect(html).toMatch(/\bh-full\b/);
  });
});
