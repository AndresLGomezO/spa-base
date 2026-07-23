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

  it("parses a synthetic custom views catalog", () => {
    const portable = toPortableCustomViewDefinition(baseRecord, {
      entityQueryDefinitionName: "Upcoming payments",
    });
    const second = toPortableCustomViewDefinition(
      {
        ...baseRecord,
        id: "custom_view_2",
        viewId: "due-this-month",
        name: "Due this month",
      },
      { entityQueryDefinitionName: "Due this month" },
    );
    const envelope = createCustomViewsCatalogEnvelope([
      { ...portable, hiddenFromNav: true },
      { ...second, hiddenFromNav: true },
    ]);
    const parsed = parseCustomViewsCatalogJson(JSON.stringify(envelope));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        parsed.errors
          .map((error) => `${error.path}: ${error.message}`)
          .join("\n"),
      );
    }

    expect(parsed.data.customViews).toHaveLength(2);
    for (const view of parsed.data.customViews) {
      expect(view.hiddenFromNav).toBe(true);
    }
    expect(parsed.data.customViews.map((view) => view.viewId).sort()).toEqual([
      "due-this-month",
      "upcoming-payments",
    ]);
  });
});
