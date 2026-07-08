import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseEntityQueryDefinitionsCatalogJson } from "@repo/entity-queries";
import type { EntityQueryFilterCondition } from "@repo/entity-queries";

import {
  hasLocalTenantUiSlices,
  seedLocalTenantUiSlicesIfPresent,
} from "./seed-local-tenant-ui-slices.js";
import { parseRatesEntityUiOverridesCatalog } from "./seed-rates-entity-ui-overrides.js";

const FIXTURES_UI_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "local-ui-slices",
);

describe("seed-local-tenant-ui-slices", () => {
  it("detects local UI slice files when present", () => {
    expect(hasLocalTenantUiSlices(FIXTURES_UI_DIR)).toBe(true);
  });

  it("returns false when UI slice directory is empty", () => {
    const uiDir = join(mkdtempSync(join(tmpdir(), "local-ui-empty-")), "ui");
    mkdirSync(uiDir, { recursive: true });
    expect(hasLocalTenantUiSlices(uiDir)).toBe(false);
  });

  it("parses local query definitions slice", () => {
    const parsed = parseEntityQueryDefinitionsCatalogJson(
      readFileSync(
        join(FIXTURES_UI_DIR, "entity-query-definitions-slice.json"),
        "utf8",
      ),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.entityQueryDefinitions).toHaveLength(4);
    expect(parsed.data.entityQueryDefinitions[0]?.name).toBe(
      "Upcoming payments (dashboard)",
    );
    expect(parsed.data.entityQueryDefinitions[0]?.limitMode).toBe("all");
    expect(
      parsed.data.entityQueryDefinitions.map((query) => query.name),
    ).toEqual(
      expect.arrayContaining([
        "Upcoming payments (dashboard)",
        "Due today (metrics)",
        "Upcoming this week (metrics)",
        "Top outflow category (period)",
      ]),
    );

    const topOutflow = parsed.data.entityQueryDefinitions.find(
      (query) => query.name === "Top outflow category (period)",
    );
    expect(topOutflow?.queryMode).toBe("aggregated");
    expect(topOutflow?.groupBy).toEqual(["categoryId"]);
    expect(topOutflow?.groupLimit).toBe(1);
    expect(topOutflow?.parameters ?? []).toEqual([]);
    expect(
      topOutflow?.filter.type === "group"
        ? topOutflow.filter.children
            .filter(
              (child): child is EntityQueryFilterCondition =>
                child.type === "condition" && child.field === "date",
            )
            .map((child) => child.value)
        : [],
    ).toEqual([
      { type: "temporal", preset: "startOfMonth" },
      { type: "temporal", preset: "endOfMonth" },
    ]);

    const upcomingPayments = parsed.data.entityQueryDefinitions.find(
      (query) => query.name === "Upcoming payments (dashboard)",
    );
    const dateConditions =
      upcomingPayments?.filter.type === "group"
        ? upcomingPayments.filter.children.filter(
            (child) => child.type === "condition",
          )
        : [];
    const monthConditions = dateConditions.filter(
      (child) => child.field === "dueDate",
    );
    expect(monthConditions).toEqual([
      {
        type: "condition",
        field: "dueDate",
        operator: ">=",
        value: { type: "temporal", preset: "startOfMonth" },
      },
      {
        type: "condition",
        field: "dueDate",
        operator: "<=",
        value: { type: "temporal", preset: "endOfMonth" },
      },
    ]);
    expect(upcomingPayments?.parameters ?? []).toEqual([]);
  });

  it("parses local paymentSchedule widget override slice", () => {
    const catalog = parseRatesEntityUiOverridesCatalog(
      readFileSync(
        join(FIXTURES_UI_DIR, "paymentSchedule-entity-ui-overrides.json"),
        "utf8",
      ),
    );

    const override = catalog.overrides[0];
    expect(override?.entityName).toBe("paymentSchedule");
    expect(override?.metricWidgets?.map((widget) => widget.id)).toEqual(
      expect.arrayContaining([
        "upcoming-payments-dashboard",
        "due-today-snapshot-mini",
        "upcoming-week-snapshot-mini",
        "budget-status-snapshot-mini",
      ]),
    );

    const upcomingWidget = override?.metricWidgets?.find(
      (widget) => widget.id === "upcoming-payments-dashboard",
    );

    const layout = upcomingWidget?.layout as {
      root?: {
        columns?: Array<{ rows?: Array<{ component?: { kind?: string } }> }>;
      };
    };
    const cardRows =
      layout.root?.columns?.[0]?.rows?.[0]?.component?.kind === "container"
        ? (layout.root.columns[0].rows[0].component as { rows?: unknown[] })
            .rows
        : [];
    const findQueryViewer = (
      rows: unknown[] | undefined,
    ): { component?: { emptyStateRows?: unknown[] } } | undefined => {
      for (const row of rows ?? []) {
        if (typeof row === "object" && row !== null && "component" in row) {
          const component = (
            row as { component?: { kind?: string; rows?: unknown[] } }
          ).component;
          if (component?.kind === "query-viewer") {
            return row as { component?: { emptyStateRows?: unknown[] } };
          }
          const nested = findQueryViewer(component?.rows);
          if (nested) {
            return nested;
          }
        }
      }
      return undefined;
    };
    const queryViewer = findQueryViewer(cardRows);

    expect(queryViewer?.component?.emptyStateRows?.length).toBeGreaterThan(0);

    const shellStyles = (
      layout.root?.columns?.[0]?.rows?.[0]?.component as {
        styles?: Array<{ property: string; value: string }>;
      }
    )?.styles;
    expect(shellStyles).toEqual(
      expect.arrayContaining([
        { property: "width", value: "100%" },
        { property: "height", value: "423" },
      ]),
    );
  });

  it("parses local financial snapshot dashboard section slice", () => {
    const slice = JSON.parse(
      readFileSync(
        join(FIXTURES_UI_DIR, "tenant-dashboard-layout-slice.json"),
        "utf8",
      ),
    ) as {
      dashboardSections: Array<{ id: string; name: string; layout: unknown }>;
      shellAppendRows?: Array<{ id: string; component: { rows: unknown[] } }>;
    };

    expect(slice.shellAppendRows).toBeUndefined();
    expect(slice.dashboardSections).toHaveLength(2);
    expect(slice.dashboardSections[0]?.id).toBe("financial-snapshot");
    expect(slice.dashboardSections[0]?.name).toBe("Financial Snapshot");
    expect(slice.dashboardSections[1]?.id).toBe("recent-activity");
    expect(slice.dashboardSections[1]?.name).toBe("Recent Activity");

    const sectionRootRow = (
      slice.dashboardSections[0]?.layout as {
        root: {
          columns: Array<{
            rows: Array<{
              id?: string;
              component: {
                kind?: string;
                stackDirection?: string;
                rows: Array<{
                  id?: string;
                  component?: {
                    kind?: string;
                    widgetId?: string;
                    entityName?: string;
                    rows?: unknown[];
                    styles?: Array<{
                      property: string;
                      value: string;
                      valuesByBreakpoint?: Record<string, string>;
                    }>;
                  };
                }>;
                styles?: Array<{ property: string; value: string }>;
              };
            }>;
          }>;
        };
      }
    ).root.columns[0]?.rows[0];

    expect(sectionRootRow?.id).toBe("row-823231a6-e0b9-4ea3-885a-b7c2473e1d1f");
    expect(sectionRootRow?.component?.kind).toBe("container");
    expect(sectionRootRow?.component?.stackDirection).toBe("row");
    expect(sectionRootRow?.component?.rows).toHaveLength(2);
    expect(sectionRootRow?.component?.styles).toEqual(
      expect.arrayContaining([
        { property: "flexWrap", value: "wrap" },
        { property: "gap", value: "var(--spacing-comfortable)" },
      ]),
    );

    const upcomingPayments = sectionRootRow?.component.rows[0]?.component;
    expect(upcomingPayments?.kind).toBe("metric-widget");
    expect(upcomingPayments?.widgetId).toBe("upcoming-payments-dashboard");
    expect(upcomingPayments?.entityName).toBe("paymentSchedule");
    expect(upcomingPayments?.styles).toEqual(
      expect.arrayContaining([
        { property: "height", value: "100%" },
        { property: "maxWidth", value: "550" },
      ]),
    );

    const spendingColumn = sectionRootRow?.component.rows[1]?.component as {
      kind?: string;
      stackDirection?: string;
      rows?: Array<{
        id?: string;
        component?: {
          kind?: string;
          stackDirection?: string;
          widgetId?: string;
          entityName?: string;
          rows?: Array<{ component?: { widgetId?: string } }>;
          styles?: Array<{
            property: string;
            value: string;
            valuesByBreakpoint?: Record<string, string>;
          }>;
        };
      }>;
      styles?: Array<{ property: string; value: string }>;
    };
    expect(spendingColumn?.kind).toBe("container");
    expect(spendingColumn?.stackDirection).toBe("column");
    expect(spendingColumn?.rows).toHaveLength(2);
    expect(spendingColumn?.styles).toEqual(
      expect.arrayContaining([
        { property: "gap", value: "var(--spacing-compact)" },
        { property: "height", value: "100%" },
      ]),
    );

    const miniRow = spendingColumn?.rows?.[0]?.component;
    expect(miniRow?.kind).toBe("container");
    expect(miniRow?.stackDirection).toBe("row");
    expect(miniRow?.rows).toHaveLength(3);
    expect(
      (miniRow?.rows ?? []).map((row) => row.component?.widgetId),
    ).toEqual([
      "due-today-snapshot-mini",
      "upcoming-week-snapshot-mini",
      "budget-status-snapshot-mini",
    ]);

    const topCategoryWidget = spendingColumn?.rows?.[1]?.component;
    expect(topCategoryWidget?.widgetId).toBe("top-expense-category-snapshot");
    expect(topCategoryWidget?.entityName).toBe("transaction");
    expect(topCategoryWidget?.styles).toEqual(
      expect.arrayContaining([
        {
          property: "maxWidth",
          value: "100%",
          valuesByBreakpoint: { base: "50%" },
        },
        { property: "height", value: "auto" },
      ]),
    );

    const recentActivityRoot = (
      slice.dashboardSections[1]?.layout as {
        root: {
          columns: Array<{
            rows: Array<{
              id?: string;
              component: {
                kind?: string;
                rows: Array<{
                  component?: {
                    kind?: string;
                    widgetId?: string;
                    entityName?: string;
                    label?: string;
                    styles?: Array<{
                      property: string;
                      value: string;
                      valuesByBreakpoint?: Record<string, string>;
                    }>;
                  };
                }>;
                styles?: Array<{ property: string; value: string }>;
              };
            }>;
          }>;
        };
      }
    ).root.columns[0]?.rows[0];

    expect(recentActivityRoot?.id).toBe("row-recent-activity-section-root");
    expect(recentActivityRoot?.component?.kind).toBe("container");
    expect(recentActivityRoot?.component?.rows).toHaveLength(1);
    expect(recentActivityRoot?.component?.styles).toEqual(
      expect.arrayContaining([{ property: "height", value: "300" }]),
    );

    const recentActivityWidget = recentActivityRoot?.component.rows[0]?.component;
    expect(recentActivityWidget?.kind).toBe("metric-widget");
    expect(recentActivityWidget?.widgetId).toBe("recent-activity-transactions");
    expect(recentActivityWidget?.entityName).toBe("transaction");
    expect(recentActivityWidget?.label).toBe("Transactions · Recent Activity");
    expect(recentActivityWidget?.styles).toEqual(
      expect.arrayContaining([
        {
          property: "width",
          value: "50%",
          valuesByBreakpoint: { sm: "100%" },
        },
        { property: "height", value: "100%" },
      ]),
    );
  });

  it("exports seedLocalTenantUiSlicesIfPresent", () => {
    expect(typeof seedLocalTenantUiSlicesIfPresent).toBe("function");
  });
});
