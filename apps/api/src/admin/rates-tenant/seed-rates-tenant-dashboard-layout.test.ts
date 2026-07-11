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

    expect(catalog.dashboardSections).toHaveLength(2);
    expect(catalog.dashboardSections[0]).toMatchObject({
      id: "section-0640c4bd-4f0d-4af0-a055-b15580892a03",
      name: "Greetings",
    });
    expect(catalog.dashboardSections[1]).toMatchObject({
      id: "account-metrics",
      name: "Account Metrics",
    });

    const sectionLayoutJson = JSON.stringify(
      catalog.dashboardSections[1]?.layout,
    );
    expect(sectionLayoutJson).toMatch(/"kind":"container"/);
    expect(sectionLayoutJson).toMatch(/"stackDirection":"row"/);
    expect(sectionLayoutJson).toContain("var(--spacing-comfortable)");
    expect(sectionLayoutJson).toContain("var(--spacing-compact)");
    expect(sectionLayoutJson).toContain('"property":"flexWrap"');
    expect(sectionLayoutJson).toContain('"value":"wrap"');
    expect(sectionLayoutJson).toMatch(/total-balance-by-month/);
    expect(sectionLayoutJson).toMatch(/income-by-month/);
    expect(sectionLayoutJson).toMatch(/expenses-by-month/);
    expect(sectionLayoutJson).toMatch(/invest-by-month/);
    expect(sectionLayoutJson).not.toMatch(/"kind":"grid"/);

    const balanceIndex = sectionLayoutJson.indexOf("total-balance-by-month");
    const incomeIndex = sectionLayoutJson.indexOf("income-by-month");
    const expensesIndex = sectionLayoutJson.indexOf("expenses-by-month");
    const investIndex = sectionLayoutJson.indexOf("invest-by-month");

    expect(balanceIndex).toBeLessThan(incomeIndex);
    expect(incomeIndex).toBeLessThan(expensesIndex);
    expect(expensesIndex).toBeLessThan(investIndex);

    const greetingsLayoutJson = JSON.stringify(
      catalog.dashboardSections[0]?.layout,
    );
    expect(greetingsLayoutJson).toMatch(/Good morning,/);
    expect(greetingsLayoutJson).toMatch(/Let's make today count\./);
    expect(greetingsLayoutJson).toMatch(/view-search/);
    expect(greetingsLayoutJson).toMatch(/notification-bell/);
    expect(greetingsLayoutJson).toMatch(/profile-button/);
    expect(greetingsLayoutJson).toMatch(
      /row-63bd041e-8a8b-4241-ba9b-b56f71c3121c/,
    );
    expect(greetingsLayoutJson).toMatch(/"iconSize":25/);
    expect(greetingsLayoutJson).toMatch(/"imageSize":35/);
    expect(greetingsLayoutJson).toMatch(/view-date-filter/);
    expect(greetingsLayoutJson).toMatch(
      /row-db15fb24-86b9-4587-a514-186e965a31ab/,
    );
    expect(greetingsLayoutJson).toMatch(/"property":"height"/);
    expect(greetingsLayoutJson).toMatch(/"value":"100%"/);
    expect(greetingsLayoutJson).toMatch(/"displayFrom":"sm"/);
    expect(greetingsLayoutJson).toMatch(/"displayTo":"xl"/);

    const shellJson = JSON.stringify(catalog.dashboardLayout);
    expect(shellJson).toMatch(/section-0640c4bd-4f0d-4af0-a055-b15580892a03/);
    expect(shellJson).toMatch(/dashboard-section/);
    expect(shellJson).toMatch(/account-metrics/);
    expect(shellJson).toMatch(/financial-snapshot/);
    expect(shellJson).toMatch(/recent-activity/);
    expect(shellJson).toContain("var(--spacing-comfortable)");
    expect(shellJson).toContain("var(--spacing-macro)");
    expect(shellJson).toMatch(/row-f32cf5da-dca5-4a9d-8ca8-6cc6ac250fcd/);
    expect(shellJson).toMatch(/Recent Activity/);
  });
});
