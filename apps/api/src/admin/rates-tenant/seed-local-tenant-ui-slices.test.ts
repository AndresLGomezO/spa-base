import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseEntityQueryDefinitionsCatalogJson } from "@repo/entity-queries";

import {
  hasLocalTenantUiSlices,
  seedLocalTenantUiSlicesIfPresent,
} from "./seed-local-tenant-ui-slices.js";
import { parseRatesEntityUiOverridesCatalog } from "./seed-rates-entity-ui-overrides.js";

const REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
);
const LOCAL_UI_DIR = join(REPO_ROOT, ".local/tenant-import/ui");

describe("seed-local-tenant-ui-slices", () => {
  it("detects local UI slice files when present", () => {
    expect(hasLocalTenantUiSlices(LOCAL_UI_DIR)).toBe(true);
  });

  it("parses local query definitions slice", () => {
    const parsed = parseEntityQueryDefinitionsCatalogJson(
      readFileSync(
        join(LOCAL_UI_DIR, "entity-query-definitions-slice.json"),
        "utf8",
      ),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.entityQueryDefinitions).toHaveLength(3);
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
      ]),
    );
  });

  it("parses local paymentSchedule widget override slice", () => {
    const catalog = parseRatesEntityUiOverridesCatalog(
      readFileSync(
        join(LOCAL_UI_DIR, "paymentSchedule-entity-ui-overrides.json"),
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
        { property: "height", value: "400" },
      ]),
    );
  });

  it("parses local financial snapshot dashboard section slice", () => {
    const slice = JSON.parse(
      readFileSync(
        join(LOCAL_UI_DIR, "tenant-dashboard-layout-slice.json"),
        "utf8",
      ),
    ) as {
      dashboardSections: Array<{ id: string; name: string; layout: unknown }>;
      shellAppendRows: Array<{ id: string; component: { rows: unknown[] } }>;
    };

    expect(slice.dashboardSections).toHaveLength(1);
    expect(slice.dashboardSections[0]?.id).toBe("financial-snapshot");
    expect(slice.dashboardSections[0]?.name).toBe("Financial Snapshot");

    const gridRow = (
      slice.dashboardSections[0]?.layout as {
        root: {
          columns: Array<{
            rows: Array<{ component: { kind: string; rows: unknown[] } }>;
          }>;
        };
      }
    ).root.columns[0]?.rows[0]?.component;

    expect(gridRow?.kind).toBe("grid");
    expect(gridRow?.rows).toHaveLength(3);

    const spendingTrack = gridRow?.rows[1] as {
      component?: {
        kind?: string;
        rows?: Array<{
          id?: string;
          component?: { kind?: string; rows?: unknown[] };
        }>;
      };
    };
    expect(spendingTrack?.component?.kind).toBe("container");
    expect(spendingTrack?.component?.rows).toHaveLength(2);

    const upperBand = spendingTrack?.component?.rows?.[0];
    expect(upperBand?.id).toBe("row-spending-snapshot-upper");

    const miniGrid = (
      upperBand?.component as { rows?: Array<{ component?: { kind?: string; rows?: unknown[] } }> }
    )?.rows?.[0]?.component;
    expect(miniGrid?.kind).toBe("grid");
    expect(miniGrid?.rows).toHaveLength(3);

    const miniWidgetIds = (miniGrid?.rows ?? []).map((track) => {
      const container = track as {
        component?: { rows?: Array<{ component?: { widgetId?: string } }> };
      };
      return container.component?.rows?.[0]?.component?.widgetId;
    });
    expect(miniWidgetIds).toEqual([
      "due-today-snapshot-mini",
      "upcoming-week-snapshot-mini",
      "budget-status-snapshot-mini",
    ]);

    const shellRow = slice.shellAppendRows[0];
    expect(shellRow?.id).toBe("track-financial-snapshot");
    expect(
      (
        shellRow?.component.rows[0] as {
          component?: { sectionId?: string };
        }
      )?.component?.sectionId,
    ).toBe("financial-snapshot");
  });

  it("exports seedLocalTenantUiSlicesIfPresent", () => {
    expect(typeof seedLocalTenantUiSlicesIfPresent).toBe("function");
  });
});
