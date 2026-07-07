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
    expect(catalog.overrides[1]?.metricWidgets).toHaveLength(1);
    expect(catalog.overrides[1]?.metricWidgets?.[0]?.id).toBe(
      "top-expense-category-snapshot",
    );

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
  });
});
