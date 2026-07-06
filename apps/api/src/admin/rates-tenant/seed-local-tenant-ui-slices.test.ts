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

    expect(parsed.data.entityQueryDefinitions).toHaveLength(1);
    expect(parsed.data.entityQueryDefinitions[0]?.name).toBe(
      "Upcoming payments (dashboard)",
    );
    expect(parsed.data.entityQueryDefinitions[0]?.limit).toBe(4);
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
    expect(override?.metricWidgets?.[0]?.id).toBe(
      "upcoming-payments-dashboard",
    );

    const layout = override?.metricWidgets?.[0]?.layout as {
      root?: {
        columns?: Array<{ rows?: Array<{ component?: { kind?: string } }> }>;
      };
    };
    const cardRows =
      layout.root?.columns?.[0]?.rows?.[0]?.component?.kind === "container"
        ? (layout.root.columns[0].rows[0].component as { rows?: unknown[] })
            .rows
        : [];
    const queryViewer = cardRows?.find(
      (row) =>
        typeof row === "object" &&
        row !== null &&
        "component" in row &&
        (row as { component?: { kind?: string } }).component?.kind ===
          "query-viewer",
    ) as { component?: { emptyStateRows?: unknown[] } } | undefined;

    expect(queryViewer?.component?.emptyStateRows?.length).toBeGreaterThan(0);
  });

  it("exports seedLocalTenantUiSlicesIfPresent", () => {
    expect(typeof seedLocalTenantUiSlicesIfPresent).toBe("function");
  });
});
