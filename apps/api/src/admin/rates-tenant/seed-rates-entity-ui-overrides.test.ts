import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseRatesEntityUiOverridesCatalog } from "./seed-rates-entity-ui-overrides.js";

const catalogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "catalogs",
  "rates-entity-ui-overrides.json",
);

describe("rates entity UI overrides catalog", () => {
  it("parses JSON handoff catalog with inline layout documents", () => {
    const catalog = parseRatesEntityUiOverridesCatalog(
      readFileSync(catalogPath, "utf8"),
    );

    expect(catalog.overrides).toHaveLength(2);
    expect(catalog.overrides[0]?.entityName).toBe("account");
    expect(catalog.overrides[0]?.metricWidgets).toHaveLength(4);
    expect(catalog.overrides[1]?.entityName).toBe("transaction");
    expect(catalog.overrides[1]?.metricWidgets).toHaveLength(2);
    expect(catalog.overrides[1]?.metricWidgets?.[0]?.id).toBe(
      "top-expense-category-snapshot",
    );
    expect(catalog.overrides[1]?.metricWidgets?.[1]?.id).toBe(
      "recent-activity-transactions",
    );
    expect(catalog.overrides[1]?.metricRowLayout).toBeDefined();

    for (const widget of catalog.overrides[0]?.metricWidgets ?? []) {
      expect(widget.layout).toBeDefined();
      expect(widget).not.toHaveProperty("compactMetricCard");
    }

    const totalBalance = catalog.overrides[0]?.metricWidgets?.find(
      (widget) => widget.id === "total-balance-by-month",
    );
    expect(totalBalance?.layout).toBeDefined();

    const income = catalog.overrides[0]?.metricWidgets?.find(
      (widget) => widget.id === "income-by-month",
    );
    expect(income?.layout).toBeDefined();

    const incomeCardStyles = findComponentStyles(
      income?.layout,
      "row-income-card",
    );
    expect(incomeCardStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "backdropFilter",
          value: "var(--backdrop-filter-card)",
        }),
        expect.objectContaining({
          property: "borderColor",
          value: "var(--color-card-border)",
        }),
        expect.objectContaining({
          property: "boxShadow",
          value: "var(--shadow-card)",
        }),
      ]),
    );
    expect(
      findComponentById(income?.layout, "row-income-card-glow"),
    ).toBeDefined();

    const totalBalanceCardStyles = findComponentStyles(
      totalBalance?.layout,
      "row-gradient-card",
    );
    expect(totalBalanceCardStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "backdropFilter",
          value: "var(--backdrop-filter-card)",
        }),
        expect.objectContaining({
          property: "backgroundColor",
          value: "var(--color-card)",
        }),
      ]),
    );
    expect(
      findComponentById(totalBalance?.layout, "row-total-balance-card-glow"),
    ).toBeDefined();

    const topCategory = catalog.overrides[1]?.metricWidgets?.find(
      (widget) => widget.id === "top-expense-category-snapshot",
    );
    const topCategoryCardStyles = findComponentStyles(
      topCategory?.layout,
      "row-e592cf39-0520-45c0-a614-83e8c2b8dac9",
    );
    expect(topCategoryCardStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "backdropFilter",
          value: "var(--backdrop-filter-card)",
        }),
      ]),
    );

    const recentActivity = catalog.overrides[1]?.metricWidgets?.find(
      (widget) => widget.id === "recent-activity-transactions",
    );
    expect(
      findComponentById(recentActivity?.layout, "row-recent-activity-shell"),
    ).toBeUndefined();
    const recentActivityCardStyles = findComponentStyles(
      recentActivity?.layout,
      "row-recent-activity-card",
    );
    expect(recentActivityCardStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: "height", value: "300" }),
        expect.objectContaining({
          property: "backdropFilter",
          value: "var(--backdrop-filter-card)",
        }),
      ]),
    );
  });

  it("normalizes legacy listViewType table to expandableTable", () => {
    const catalog = parseRatesEntityUiOverridesCatalog(
      JSON.stringify({
        kind: "entity-ui-overrides-catalog",
        version: 1,
        overrides: [
          {
            entityName: "paymentSchedule",
            views: [{ type: "table", name: "default", fields: ["dueDate"] }],
            listViewType: "table",
          },
        ],
      }),
    );

    expect(catalog.overrides[0]?.listViewType).toBe("expandableTable");
  });
});

function findComponentById(layout: unknown, id: string): unknown {
  const typedLayout = layout as
    | { readonly root?: { readonly columns?: readonly unknown[] } }
    | undefined;
  const columns = typedLayout?.root?.columns;
  if (!Array.isArray(columns)) {
    return undefined;
  }
  for (const column of columns) {
    const found = walkRows((column as { rows?: readonly unknown[] }).rows, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function findComponentStyles(
  layout: unknown,
  id: string,
):
  | readonly { readonly property: string; readonly value: string }[]
  | undefined {
  const component = findComponentById(layout, id) as
    | {
        readonly component?: {
          readonly styles?: readonly {
            readonly property: string;
            readonly value: string;
          }[];
        };
      }
    | undefined;
  return component?.component?.styles;
}

function walkRows(rows: readonly unknown[] | undefined, id: string): unknown {
  if (!Array.isArray(rows)) {
    return undefined;
  }
  for (const row of rows) {
    const typed = row as {
      readonly id?: string;
      readonly component?: { readonly rows?: readonly unknown[] };
    };
    if (typed.id === id) {
      return row;
    }
    const nested = walkRows(typed.component?.rows, id);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}
