/** @vitest-environment jsdom */

import { createDefaultFormLayout } from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import {
  RecursiveLayoutRenderer,
  type RowWrapper,
} from "./RecursiveLayoutRenderer.js";

const minimalContext: LayoutRenderContext = {
  mode: "form",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

describe("RecursiveLayoutRenderer rowWrapper", () => {
  it("passes root row locator to the row wrapper", () => {
    const fieldPath = "name";
    const layout = createDefaultFormLayout([fieldPath]);
    const rowId = layout.root.columns[0]?.rows[0]?.id;
    const captures: Array<{ rowId: string; locator: unknown }> = [];

    const rowWrapper: RowWrapper = (row, locator, children) => {
      captures.push({ rowId: row.id, locator });
      return <div data-testid={`wrap-${row.id}`}>{children}</div>;
    };

    renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={layout}
        context={minimalContext}
        rowWrapper={rowWrapper}
      />,
    );

    expect(rowId).toBeDefined();
    expect(captures).toEqual([
      {
        rowId,
        locator: { scope: "root", columnIndex: 0 },
      },
    ]);
  });
});
