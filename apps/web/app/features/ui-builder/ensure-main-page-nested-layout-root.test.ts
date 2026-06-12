import { createDefaultMainPageLayout } from "@repo/entities";
import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  ensureMainPageNestedLayoutRoot,
  resolveMainPageRootNestedLayout,
} from "./ensure-main-page-nested-layout-root";

describe("ensureMainPageNestedLayoutRoot", () => {
  it("leaves canonical nested root layouts unchanged", () => {
    const layout = createDefaultMainPageLayout();
    const normalized = ensureMainPageNestedLayoutRoot(layout);

    expect(normalized).toBe(layout);
    expect(resolveMainPageRootNestedLayout(normalized)?.row.columnCount).toBe(
      1,
    );
  });

  it("wraps flat root rows in a nested layout row", () => {
    let layout = createEmptyLayout(1);
    const locator = { scope: "root" as const, columnIndex: 0 };

    for (const kind of ["page-toolbar", "page-metrics", "page-list"] as const) {
      layout = addComponentRowAt(
        layout,
        locator,
        createDefaultComponent(kind, ""),
      );
    }

    const normalized = ensureMainPageNestedLayoutRoot(layout);
    const rootNested = resolveMainPageRootNestedLayout(normalized);

    expect(rootNested).not.toBeNull();
    expect(rootNested?.row.columnCount).toBe(1);
    expect(rootNested?.row.columns[0]?.rows).toHaveLength(3);
    expect(normalized.root.columns[0]?.rows).toHaveLength(1);
  });
});
