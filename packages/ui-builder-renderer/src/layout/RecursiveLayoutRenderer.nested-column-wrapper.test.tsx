/** @vitest-environment jsdom */

import {
  createEmptyColumn,
  createEmptyLayout,
  createLayoutId,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import {
  RecursiveLayoutRenderer,
  type NestedColumnWrapper,
} from "./RecursiveLayoutRenderer.js";

const minimalContext: LayoutRenderContext = {
  mode: "form",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

describe("RecursiveLayoutRenderer nestedColumnWrapper", () => {
  it("wraps columns inside a nested-layout row", () => {
    const layout = createEmptyLayout(1);
    const nestedRowId = createLayoutId("nested");
    const nested: (typeof layout.root.columns)[0]["rows"][0] = {
      type: "nested-layout",
      id: nestedRowId,
      columnCount: 2,
      columns: [createEmptyColumn(), createEmptyColumn()],
    };

    const withNested = {
      ...layout,
      root: {
        ...layout.root,
        columns: [{ ...layout.root.columns[0]!, rows: [nested] }],
      },
    };

    const captures: Array<{
      nestedColumnIndex: number;
      context: { rootColumnIndex: number; nestedParentRowId: string };
    }> = [];

    const nestedColumnWrapper: NestedColumnWrapper = (
      nestedColumnIndex,
      _column,
      context,
      children,
    ) => {
      captures.push({ nestedColumnIndex, context });
      return (
        <div data-testid={`nested-col-${nestedColumnIndex}`}>{children}</div>
      );
    };

    renderToStaticMarkup(
      <RecursiveLayoutRenderer
        layout={withNested}
        context={minimalContext}
        nestedColumnWrapper={nestedColumnWrapper}
      />,
    );

    expect(captures).toEqual([
      {
        nestedColumnIndex: 0,
        context: { rootColumnIndex: 0, nestedParentRowId: nestedRowId },
      },
      {
        nestedColumnIndex: 1,
        context: { rootColumnIndex: 0, nestedParentRowId: nestedRowId },
      },
    ]);
  });
});
