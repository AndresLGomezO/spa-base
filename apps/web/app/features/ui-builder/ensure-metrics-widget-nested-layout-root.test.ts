import { createDefaultUiLayout } from "@repo/entities";
import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  ensureMetricsWidgetNestedLayoutRoot,
  resolveMetricsWidgetRootNestedLayout,
} from "./ensure-metrics-widget-nested-layout-root";

describe("ensureMetricsWidgetNestedLayoutRoot", () => {
  it("leaves canonical nested root layouts unchanged", () => {
    const layout = ensureMetricsWidgetNestedLayoutRoot(
      createDefaultUiLayout(["name"]),
    );
    const normalized = ensureMetricsWidgetNestedLayoutRoot(layout);

    expect(normalized).toBe(layout);
    expect(
      resolveMetricsWidgetRootNestedLayout(normalized)?.row.columnCount,
    ).toBe(1);
  });

  it("wraps flat root rows in a nested layout row", () => {
    let layout = createEmptyLayout(1);
    const locator = { scope: "root" as const, columnIndex: 0 };

    layout = addComponentRowAt(
      layout,
      locator,
      createDefaultComponent("text", "name"),
    );

    const normalized = ensureMetricsWidgetNestedLayoutRoot(layout);
    const rootNested = resolveMetricsWidgetRootNestedLayout(normalized);

    expect(rootNested).not.toBeNull();
    expect(rootNested?.row.columnCount).toBe(1);
    expect(rootNested?.row.columns[0]?.rows).toHaveLength(1);
    expect(normalized.root.columns[0]?.rows).toHaveLength(1);
  });
});
