import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseEntityQueryDefinitionsCatalogJson } from "@repo/entity-queries";

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
        "Overdue payments (metrics)",
        "Upcoming this week (metrics)",
      ]),
    );
    expect(
      parsed.data.entityQueryDefinitions.map((query) => query.name),
    ).not.toEqual(
      expect.arrayContaining(["Due today", "Top outflow category (period)"]),
    );

    const dueTodayMetrics = parsed.data.entityQueryDefinitions.find(
      (query) => query.name === "Due today (metrics)",
    );
    expect(
      dueTodayMetrics?.filter.type === "group"
        ? dueTodayMetrics.filter.children.filter(
            (child) => child.type === "condition" && child.field === "dueDate",
          )
        : [],
    ).toEqual([
      {
        type: "condition",
        field: "dueDate",
        operator: ">=",
        value: { type: "temporal", preset: "startOfDay" },
      },
      {
        type: "condition",
        field: "dueDate",
        operator: "<=",
        value: { type: "temporal", preset: "endOfDay" },
      },
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
        operator: "<=",
        value: { type: "parameter", name: "period", bound: "end" },
      },
    ]);
    expect(upcomingPayments?.parameters ?? []).toEqual([
      {
        name: "period",
        valueType: "dateBucket",
        granularity: "month",
        field: "dueDate",
      },
    ]);
    const incomeExclusions =
      upcomingPayments?.filter.type === "group"
        ? upcomingPayments.filter.children.filter(
            (child) =>
              child.type === "condition" &&
              child.field === "financialItemId.flowKind",
          )
        : [];
    expect(incomeExclusions).toEqual([
      {
        type: "condition",
        field: "financialItemId.flowKind",
        operator: "!=",
        value: { type: "static", value: "INCOME" },
      },
    ]);

    const overdueMetrics = parsed.data.entityQueryDefinitions.find(
      (query) => query.name === "Overdue payments (metrics)",
    );
    expect(
      overdueMetrics?.filter.type === "group"
        ? overdueMetrics.filter.children.filter(
            (child) =>
              child.type === "condition" &&
              child.field === "financialItemId.flowKind",
          )
        : [],
    ).toEqual([
      {
        type: "condition",
        field: "financialItemId.flowKind",
        operator: "!=",
        value: { type: "static", value: "INCOME" },
      },
    ]);
    const overdueDateConditions =
      overdueMetrics?.filter.type === "group"
        ? overdueMetrics.filter.children.filter(
            (child) => child.type === "condition" && child.field === "dueDate",
          )
        : [];
    expect(overdueDateConditions).toEqual([
      {
        type: "condition",
        field: "dueDate",
        operator: "<=",
        value: { type: "parameter", name: "period", bound: "end" },
      },
    ]);

    const weekMetrics = parsed.data.entityQueryDefinitions.find(
      (query) => query.name === "Upcoming this week (metrics)",
    );
    expect(
      weekMetrics?.filter.type === "group"
        ? weekMetrics.filter.children.some(
            (child) =>
              child.type === "condition" &&
              child.field === "financialItemId.flowKind" &&
              child.operator === "!=",
          )
        : false,
    ).toBe(true);
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

    const upcomingPaymentsWidget = override?.metricWidgets?.find(
      (widget) => widget.id === "upcoming-payments-dashboard",
    );

    const layout = upcomingPaymentsWidget?.layout as {
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

    const cardStyles = (
      layout.root?.columns?.[0]?.rows?.[0]?.component as {
        styles?: Array<{ property: string; value: string }>;
      }
    )?.styles;
    expect(cardStyles).toEqual(
      expect.arrayContaining([
        { property: "width", value: "100%" },
        { property: "height", value: "423" },
        { property: "backgroundColor", value: "var(--color-card)" },
        { property: "backdropFilter", value: "var(--backdrop-filter-card)" },
        { property: "boxShadow", value: "var(--shadow-card)" },
      ]),
    );

    for (const [widgetId, expectedGlowId] of [
      ["due-today-snapshot-mini", "row-due-today-snapshot-mini-glow"],
    ] as const) {
      const miniWidget = override?.metricWidgets?.find(
        (widget) => widget.id === widgetId,
      );
      const shell = (
        miniWidget?.layout as {
          root?: {
            columns?: Array<{
              rows?: Array<{
                id?: string;
                component?: {
                  styles?: Array<{ property: string; value: string }>;
                  rows?: Array<{ id?: string }>;
                };
              }>;
            }>;
          };
        }
      )?.root?.columns?.[0]?.rows?.[0]?.component;
      expect(shell?.styles).toEqual(
        expect.arrayContaining([
          { property: "backgroundColor", value: "var(--color-card)" },
          { property: "backdropFilter", value: "var(--backdrop-filter-card)" },
          { property: "boxShadow", value: "var(--shadow-card)" },
          { property: "borderRadius", value: "16" },
          { property: "gap", value: "var(--spacing-comfortable)" },
        ]),
      );
      expect(shell?.rows?.some((row) => row.id === expectedGlowId)).toBe(true);
    }

    const dueTodayWidget = override?.metricWidgets?.find(
      (widget) => widget.id === "due-today-snapshot-mini",
    );
    // Overdue KPIs stay period-aware; Due Today Total/Count use calendar-day query (no period).
    const dueTodayPeriodBindings = collectMetricKpiPeriodBindings(
      dueTodayWidget?.layout,
    );
    expect(dueTodayPeriodBindings).toHaveLength(2);
    expect(dueTodayPeriodBindings).toEqual([
      {
        type: "relativePeriod",
        field: "dueDate",
        anchor: "dashboardDateFilter",
        offset: 0,
        unit: "month",
      },
      {
        type: "relativePeriod",
        field: "dueDate",
        anchor: "dashboardDateFilter",
        offset: 0,
        unit: "month",
      },
    ]);

    for (const [widgetId, glowId, gridId] of [
      [
        "upcoming-week-snapshot-mini",
        "row-upcoming-week-snapshot-mini-glow",
        "row-upcoming-week-snapshot-mini-grid",
      ],
      [
        "budget-status-snapshot-mini",
        "row-budget-status-snapshot-mini-glow",
        "row-budget-status-snapshot-mini-grid",
      ],
    ] as const) {
      const miniWidget = override?.metricWidgets?.find(
        (widget) => widget.id === widgetId,
      );
      const shell = (
        miniWidget?.layout as {
          root?: {
            columns?: Array<{
              rows?: Array<{
                component?: {
                  styles?: Array<{ property: string; value: string }>;
                  rows?: Array<{ id?: string; component?: { kind?: string } }>;
                };
              }>;
            }>;
          };
        }
      )?.root?.columns?.[0]?.rows?.[0]?.component;
      expect(shell?.styles).toEqual(
        expect.arrayContaining([
          { property: "backgroundColor", value: "var(--color-card)" },
          { property: "backdropFilter", value: "var(--backdrop-filter-card)" },
          { property: "boxShadow", value: "var(--shadow-card)" },
          { property: "borderRadius", value: "16" },
          { property: "padding", value: "13" },
        ]),
      );
      expect(shell?.rows?.some((row) => row.id === glowId)).toBe(true);
      expect(
        shell?.rows?.some(
          (row) => row.id === gridId && row.component?.kind === "grid",
        ),
      ).toBe(true);
    }

    const upcomingWeekWidget = override?.metricWidgets?.find(
      (widget) => widget.id === "upcoming-week-snapshot-mini",
    );
    const upcomingTitleColor = findStyleValueInWidget(
      upcomingWeekWidget?.layout,
      "row-upcoming-week-snapshot-mini-title",
      "color",
    );
    expect(upcomingTitleColor).toBe("var(--color-primary)");

    const paymentProgressWidget = override?.metricWidgets?.find(
      (widget) => widget.id === "budget-status-snapshot-mini",
    );
    const paymentProgressTitleColor = findStyleValueInWidget(
      paymentProgressWidget?.layout,
      "row-budget-status-snapshot-mini-title",
      "color",
    );
    expect(paymentProgressTitleColor).toBe("var(--color-primary-400)");
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
    expect(spendingColumn?.rows).toHaveLength(1);
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
    expect((miniRow?.rows ?? []).map((row) => row.component?.widgetId)).toEqual(
      [
        "due-today-snapshot-mini",
        "upcoming-week-snapshot-mini",
        "budget-status-snapshot-mini",
      ],
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

    const recentActivityWidget =
      recentActivityRoot?.component.rows[0]?.component;
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

function collectMetricKpiPeriodBindings(
  layout: unknown,
): Array<Record<string, unknown>> {
  const bindings: Array<Record<string, unknown>> = [];

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }
    const record = node as Record<string, unknown>;
    const component = record.component as Record<string, unknown> | undefined;
    if (component?.kind === "metric-kpi") {
      const parameterBindings = component.parameterBindings as
        | { period?: Record<string, unknown> }
        | undefined;
      if (parameterBindings?.period) {
        bindings.push(parameterBindings.period);
      }
    }
    for (const value of Object.values(record)) {
      walk(value);
    }
  }

  walk(layout);
  return bindings;
}

function findStyleValueInWidget(
  layout: unknown,
  rowId: string,
  property: string,
): string | undefined {
  const row = findRowById(layout, rowId) as
    | {
        readonly component?: {
          readonly styles?: readonly {
            readonly property: string;
            readonly value: string;
          }[];
        };
      }
    | undefined;
  return row?.component?.styles?.find((rule) => rule.property === property)
    ?.value;
}

function findRowById(layout: unknown, id: string): unknown {
  const typedLayout = layout as
    | { readonly root?: { readonly columns?: readonly unknown[] } }
    | undefined;
  const columns = typedLayout?.root?.columns;
  if (!Array.isArray(columns)) {
    return undefined;
  }
  for (const column of columns) {
    const found = walkRowsForId(
      (column as { rows?: readonly unknown[] }).rows,
      id,
    );
    if (found) {
      return found;
    }
  }
  return undefined;
}

function walkRowsForId(
  rows: readonly unknown[] | undefined,
  id: string,
): unknown {
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
    const nested = walkRowsForId(typed.component?.rows, id);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}
