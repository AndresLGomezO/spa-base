import { createDefaultUiLayout } from "@repo/entities";
import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  ensureMetricsRowNestedLayoutRoot,
  resolveMetricsRowRootNestedLayout,
} from "./ensure-metrics-row-nested-layout-root";

describe("ensureMetricsRowNestedLayoutRoot", () => {
  it("leaves canonical nested root layouts unchanged", () => {
    const layout = ensureMetricsRowNestedLayoutRoot(
      createDefaultUiLayout(["name"]),
    );
    const normalized = ensureMetricsRowNestedLayoutRoot(layout);

    expect(normalized).toBe(layout);
    expect(resolveMetricsRowRootNestedLayout(normalized)?.row.columnCount).toBe(
      1,
    );
  });

  it("wraps flat root rows in a nested layout row", () => {
    let layout = createEmptyLayout(1);
    const locator = { scope: "root" as const, columnIndex: 0 };

    layout = addComponentRowAt(
      layout,
      locator,
      createDefaultComponent("text", "name"),
    );

    const normalized = ensureMetricsRowNestedLayoutRoot(layout);
    const rootNested = resolveMetricsRowRootNestedLayout(normalized);

    expect(rootNested).not.toBeNull();
    expect(rootNested?.row.columns[0]?.rows.length).toBe(1);
  });
});
