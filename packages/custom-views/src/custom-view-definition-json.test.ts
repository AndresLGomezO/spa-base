import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  computeCatalogReplacePlan,
  createCustomViewDefinitionEnvelope,
  createCustomViewsCatalogEnvelope,
  parseCustomViewDefinitionJson,
  parseCustomViewsCatalogJson,
  portableToCreateCustomViewInput,
  toPortableCustomViewDefinition,
} from "./custom-view-definition-json.js";
import type { CustomViewRecord } from "./types.js";

function mergeCatalog(dir: string, kind: string, itemsKey: string): string {
  if (!existsSync(dir)) {
    throw new Error(`Catalog directory not found: ${dir}`);
  }
  const items = readdirSync(dir)
    .filter((n) => n.endsWith(".json") && !n.startsWith("_"))
    .sort()
    .map(
      (n) =>
        (JSON.parse(readFileSync(join(dir, n), "utf8")) as { data: unknown })
          .data,
    );
  return JSON.stringify({
    kind,
    version: 1,
    exportedAt: new Date().toISOString(),
    [itemsKey]: items,
  });
}

const baseRecord: CustomViewRecord = {
  id: "custom_view_1",
  tenantId: "tenant_a",
  viewId: "upcoming-payments",
  name: "Upcoming payments",
  sourceEntity: "transaction",
  entityQueryDefinitionId: "entity_query_1",
  nav: { label: "Payments", icon: "calendar" },
  ui: {
    views: [{ type: "table", name: "default", fields: ["type", "date"] }],
    listViewType: "expandableTable",
  },
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("custom-view-definition-json", () => {
  it("round-trips single view envelopes", () => {
    const portable = toPortableCustomViewDefinition(baseRecord, {
      entityQueryDefinitionName: "Upcoming payments",
    });
    const envelope = createCustomViewDefinitionEnvelope(portable);
    const parsed = parseCustomViewDefinitionJson(
      JSON.stringify(envelope, null, 2),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.viewId).toBe("upcoming-payments");
      expect(parsed.data.entityQueryDefinitionName).toBe("Upcoming payments");
    }
  });

  it("strips server metadata for portable export", () => {
    const portable = toPortableCustomViewDefinition(baseRecord, {
      entityQueryDefinitionName: "Upcoming payments",
    });
    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("sourceEntity");
    expect(portable.entityQueryDefinitionName).toBe("Upcoming payments");
  });

  it("validates duplicate viewId in catalog", () => {
    const portable = toPortableCustomViewDefinition(baseRecord, {
      entityQueryDefinitionName: "Upcoming payments",
    });
    const envelope = {
      kind: "custom-views-catalog" as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      customViews: [portable, portable],
    };
    const parsed = parseCustomViewsCatalogJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors[0]?.message).toContain("upcoming-payments");
    }
  });

  it("computes catalog replace plan by viewId", () => {
    const otherRecord: CustomViewRecord = {
      ...baseRecord,
      id: "custom_view_2",
      viewId: "income-only",
      name: "Income only",
    };

    const plan = computeCatalogReplacePlan({
      existing: [baseRecord, otherRecord],
      imported: [
        {
          name: "Upcoming payments",
          viewId: "upcoming-payments",
          entityQueryDefinitionName: "Upcoming payments",
          nav: { label: "Payments" },
          status: "ACTIVE",
        },
        {
          name: "New view",
          viewId: "new-view",
          entityQueryDefinitionName: "All transactions",
          nav: { label: "New" },
          status: "ACTIVE",
        },
      ],
    });

    expect(plan.counts).toEqual({ created: 1, updated: 1, deleted: 1 });
    expect(plan.toDelete.map((item) => item.viewId)).toEqual(["income-only"]);
    expect(plan.toCreate.map((item) => item.viewId)).toEqual(["new-view"]);
  });

  it("converts portable input to create input with resolved query id", () => {
    const portable = toPortableCustomViewDefinition(baseRecord, {
      entityQueryDefinitionName: "Upcoming payments",
    });
    const createInput = portableToCreateCustomViewInput(
      portable,
      "entity_query_1",
    );
    expect(createInput.entityQueryDefinitionId).toBe("entity_query_1");
    expect(createInput.viewId).toBe("upcoming-payments");
  });

  it("includes views in catalog envelope export", () => {
    const portable = toPortableCustomViewDefinition(baseRecord, {
      entityQueryDefinitionName: "Upcoming payments",
    });
    const envelope = createCustomViewsCatalogEnvelope([portable]);
    expect(envelope.customViews).toHaveLength(1);
    expect(envelope.customViews[0]?.viewId).toBe("upcoming-payments");
  });

  it("parses rates custom views catalog", () => {
    const catalogDir = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../apps/api/src/admin/rates-tenant/catalogs/custom-views",
    );
    const parsed = parseCustomViewsCatalogJson(
      mergeCatalog(catalogDir, "custom-views-catalog", "customViews"),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        parsed.errors
          .map((error) => `${error.path}: ${error.message}`)
          .join("\n"),
      );
    }

    expect(parsed.data.customViews).toHaveLength(4);
    for (const view of parsed.data.customViews) {
      expect(view.hiddenFromNav).toBe(true);
    }
    expect(parsed.data.customViews.map((view) => view.viewId).sort()).toEqual([
      "due-today",
      "payments-due-this-month",
      "transactions-this-month",
      "upcoming-payments",
    ]);
  });

  it("parses archived rates custom views catalog", () => {
    const catalogPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../apps/api/src/admin/rates-tenant/catalogs/removed/rates-custom-views.json",
    );
    const parsed = parseCustomViewsCatalogJson(
      readFileSync(catalogPath, "utf8"),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        parsed.errors
          .map((error) => `${error.path}: ${error.message}`)
          .join("\n"),
      );
    }

    expect(parsed.data.customViews).toHaveLength(17);
    expect(
      parsed.data.customViews.some(
        (view) => view.viewId === "accounts-by-balance",
      ),
    ).toBe(true);
  });
});
