import { describe, expect, it } from "vitest";

import {
  createEmptyLayout,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";

import { isComponentRowPanelDirty } from "./form-designer-component-row-panel-session";

describe("isComponentRowPanelDirty", () => {
  it("returns false when scoped layouts match", () => {
    const layout = createEmptyLayout(2);
    expect(isComponentRowPanelDirty(layout, structuredClone(layout))).toBe(
      false,
    );
  });

  it("returns true when scoped layouts differ", () => {
    const baseline = createEmptyLayout(2);
    const current = {
      ...baseline,
      root: {
        ...baseline.root,
        columnCount: 3,
        columns: [
          ...resolveLayoutRootColumns(baseline),
          { id: "new-col", rows: [] },
        ],
      },
    };
    expect(isComponentRowPanelDirty(baseline, current)).toBe(true);
  });
});
