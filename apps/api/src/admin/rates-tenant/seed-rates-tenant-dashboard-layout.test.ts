import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseRatesTenantDashboardLayoutCatalog } from "./seed-rates-tenant-dashboard-layout.js";

const catalogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "catalogs",
  "rates-tenant-dashboard-layout.json",
);

describe("rates tenant dashboard layout catalog", () => {
  it("parses JSON handoff catalog with balance first, then income/expenses/invest", () => {
    const catalog = parseRatesTenantDashboardLayoutCatalog(
      readFileSync(catalogPath, "utf8"),
    );

    expect(catalog.dashboardSections).toHaveLength(1);
    expect(catalog.dashboardSections[0]).toMatchObject({
      id: "account-metrics",
      name: "Account Metrics",
    });

    const sectionLayoutJson = JSON.stringify(
      catalog.dashboardSections[0]?.layout,
    );
    expect(sectionLayoutJson).toMatch(/"kind":"grid"/);
    expect(sectionLayoutJson).toContain("minmax(400px, 450px) 1fr");
    expect(sectionLayoutJson).toMatch(/"gap":"15"/);
    expect(sectionLayoutJson).toMatch(/"gap":"10"/);
    expect(sectionLayoutJson).toMatch(/total-balance-by-month/);
    expect(sectionLayoutJson).toMatch(/income-by-month/);
    expect(sectionLayoutJson).toMatch(/expenses-by-month/);
    expect(sectionLayoutJson).toMatch(/invest-by-month/);

    const balanceIndex = sectionLayoutJson.indexOf("total-balance-by-month");
    const incomeIndex = sectionLayoutJson.indexOf("income-by-month");
    const expensesIndex = sectionLayoutJson.indexOf("expenses-by-month");
    const investIndex = sectionLayoutJson.indexOf("invest-by-month");

    expect(balanceIndex).toBeLessThan(incomeIndex);
    expect(incomeIndex).toBeLessThan(expensesIndex);
    expect(expensesIndex).toBeLessThan(investIndex);

    const shellJson = JSON.stringify(catalog.dashboardLayout);
    expect(shellJson).toMatch(/dashboard-section/);
    expect(shellJson).toMatch(/account-metrics/);
    expect(shellJson).toMatch(/financial-snapshot/);
    expect(shellJson).toMatch(/recent-activity/);
    expect(shellJson).toMatch(/view-filter/);
    expect(shellJson).toMatch(/enableDateFilter/);
    expect(shellJson).toMatch(/var\(--spacing-macro\)/);
    expect(shellJson).toMatch(/row-f32cf5da-dca5-4a9d-8ca8-6cc6ac250fcd/);
    expect(shellJson).toMatch(/Recent Activity/);
  });
});
