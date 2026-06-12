import { createDefaultUiLayout } from "@repo/entities";
import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  ensureRecordDetailNestedLayoutRoot,
  resolveRecordDetailRootNestedLayout,
} from "./ensure-record-detail-nested-layout-root";

describe("ensureRecordDetailNestedLayoutRoot", () => {
  it("leaves canonical nested root layouts unchanged", () => {
    const layout = ensureRecordDetailNestedLayoutRoot(
      createDefaultUiLayout(["name", "status"]),
    );
    const normalized = ensureRecordDetailNestedLayoutRoot(layout);

    expect(normalized).toBe(layout);
    expect(
      resolveRecordDetailRootNestedLayout(normalized)?.row.columnCount,
    ).toBe(1);
  });

  it("wraps flat root rows in a nested layout row", () => {
    let layout = createEmptyLayout(1);
    const locator = { scope: "root" as const, columnIndex: 0 };

    for (const kind of ["text", "badge", "date"] as const) {
      layout = addComponentRowAt(
        layout,
        locator,
        createDefaultComponent(kind, "name"),
      );
    }

    const normalized = ensureRecordDetailNestedLayoutRoot(layout);
    const rootNested = resolveRecordDetailRootNestedLayout(normalized);

    expect(rootNested).not.toBeNull();
    expect(rootNested?.row.columnCount).toBe(1);
    expect(rootNested?.row.columns[0]?.rows).toHaveLength(3);
    expect(normalized.root.columns[0]?.rows).toHaveLength(1);
  });
});
