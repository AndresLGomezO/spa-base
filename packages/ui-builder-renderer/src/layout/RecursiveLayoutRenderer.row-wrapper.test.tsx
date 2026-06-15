/** @vitest-environment jsdom */

import {
  createDefaultFormLayout,
  resolveRootContainer,
} from "@repo/ui-builder-core";
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
  it("passes container and child row locators to the row wrapper", () => {
    const fieldPath = "name";
    const layout = createDefaultFormLayout([fieldPath]);
    const rootContainer = resolveRootContainer(layout);
    const fieldRowId = rootContainer?.config.rows[0]?.id;
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

    expect(rootContainer).not.toBeNull();
    expect(captures).toContainEqual({
      rowId: rootContainer!.row.id,
      locator: { scope: "root", columnIndex: 0 },
    });
    expect(captures).toContainEqual({
      rowId: fieldRowId,
      locator: {
        scope: "container",
        columnIndex: 0,
        containerRowId: rootContainer!.row.id,
      },
    });
  });
});
