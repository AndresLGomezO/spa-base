/** @vitest-environment jsdom */

import {
  createEmptyColumn,
  createEmptyLayout,
  createLayoutId,
  setNestedColumnWidthPercent,
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

describe("RecursiveLayoutRenderer nested layout stretch", () => {
  it("does not apply root fill classes to nested multi-column grids", () => {
    const layout = createEmptyLayout(1);
    const nestedRowId = createLayoutId("nested");
    const nested: (typeof layout.root.columns)[0]["rows"][0] = {
      type: "nested-layout",
      id: nestedRowId,
      columnCount: 2,
      columns: [createEmptyColumn(), createEmptyColumn()],
    };

    let withNested: UiLayoutDocument = {
      ...layout,
      root: {
        ...layout.root,
        columns: [{ ...layout.root.columns[0]!, rows: [nested] }],
      },
    };

    withNested = setNestedColumnWidthPercent(withNested, 0, nestedRowId, 0, 24);

    const html = renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={withNested}
        context={wizardContext}
        stretchRootColumns
      />,
    );

    const nestedGridMatch = html.match(
      /grid w-full items-stretch[^"]*grid-cols-1 sm:\[grid-template-columns:var\(--layout-proportional-cols\)\]/,
    );

    expect(nestedGridMatch).not.toBeNull();
    expect(nestedGridMatch![0]).not.toMatch(/\bflex-1\b/);
    expect(nestedGridMatch![0]).not.toMatch(/\bh-full\b/);
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
});
