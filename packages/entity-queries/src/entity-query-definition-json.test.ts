import { describe, expect, it } from "vitest";

import {
  computeCatalogReplacePlan,
  createEntityQueryDefinitionEnvelope,
  createEntityQueryDefinitionsCatalogEnvelope,
  parseEntityQueryDefinitionJson,
  parseEntityQueryDefinitionsCatalogJson,
  toPortableEntityQueryDefinition,
} from "./entity-query-definition-json.js";
import type { EntityQueryDefinitionRecord } from "./types.js";

const baseRecord: EntityQueryDefinitionRecord = {
  id: "entity_query_1",
  tenantId: "tenant_a",
  queryId: "upcoming_payments",
  name: "Upcoming payments",
  sourceEntity: "transaction",
  queryMode: "records",
  parameters: [],
  filter: {
    type: "group",
    combinator: "and",
    children: [
      {
        type: "condition",
        field: "type",
        operator: "==",
        value: { type: "static", value: "EXPENSE" },
      },
    ],
  },
  sort: [{ field: "date", direction: "desc" }],
  groupBy: [],
  aggregations: [],
  groupSort: [],
  limitMode: "topN",
  limit: 20,
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("entity-query-definition-json", () => {
  it("round-trips single query envelopes", () => {
    const envelope = createEntityQueryDefinitionEnvelope(
      toPortableEntityQueryDefinition(baseRecord),
    );
    const parsed = parseEntityQueryDefinitionJson(
      JSON.stringify(envelope, null, 2),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe("Upcoming payments");
    }
  });

  it("strips server metadata for portable catalog export", () => {
    const portable = toPortableEntityQueryDefinition(baseRecord);
    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("queryId");
    expect(portable.name).toBe("Upcoming payments");
  });

  it("validates duplicate query names in catalog", () => {
    const envelope = {
      kind: "entity-query-definitions-catalog" as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      entityQueryDefinitions: [
        toPortableEntityQueryDefinition(baseRecord),
        toPortableEntityQueryDefinition(baseRecord),
      ],
    };
    const parsed = parseEntityQueryDefinitionsCatalogJson(
      JSON.stringify(envelope),
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors[0]?.message).toContain("Upcoming payments");
    }
  });

  it("computes catalog replace plan by query name", () => {
    const otherRecord: EntityQueryDefinitionRecord = {
      ...baseRecord,
      id: "entity_query_2",
      queryId: "income_total",
      name: "Income total",
    };

    const plan = computeCatalogReplacePlan({
      existing: [baseRecord, otherRecord],
      imported: [
        {
          ...toPortableEntityQueryDefinition(baseRecord),
          limit: 50,
        },
        {
          ...toPortableEntityQueryDefinition(baseRecord),
          name: "New query",
          filter: { type: "group", combinator: "and", children: [] },
          sort: [],
          limitMode: "all",
        },
      ],
    });

    expect(plan.counts).toEqual({ created: 1, updated: 1, deleted: 1 });
    expect(plan.toDelete.map((item) => item.name)).toEqual(["Income total"]);
    expect(plan.toCreate.map((item) => item.name)).toEqual(["New query"]);
  });

  it("includes queries in catalog envelope export", () => {
    const envelope = createEntityQueryDefinitionsCatalogEnvelope([baseRecord]);
    expect(envelope.entityQueryDefinitions).toHaveLength(1);
    expect(envelope.entityQueryDefinitions[0]?.name).toBe("Upcoming payments");
  });

  it("preserves query parameters in catalog export", () => {
    const recordWithPeriod: EntityQueryDefinitionRecord = {
      ...baseRecord,
      name: "Transaction trend",
      parameters: [
        {
          name: "period",
          valueType: "dateBucket",
          granularity: "month",
          field: "date",
        },
      ],
      filter: {
        type: "group",
        combinator: "and",
        children: [
          {
            type: "condition",
            field: "date",
            operator: ">=",
            value: { type: "parameter", name: "period", bound: "start" },
          },
          {
            type: "condition",
            field: "date",
            operator: "<=",
            value: { type: "parameter", name: "period", bound: "end" },
          },
        ],
      },
    };

    const envelope = createEntityQueryDefinitionsCatalogEnvelope([
      recordWithPeriod,
    ]);

    expect(envelope.entityQueryDefinitions[0]?.parameters).toEqual([
      {
        name: "period",
        valueType: "dateBucket",
        granularity: "month",
        field: "date",
      },
    ]);
  });

  it("parses a synthetic query definitions catalog", () => {
    const otherRecord: EntityQueryDefinitionRecord = {
      ...baseRecord,
      id: "entity_query_2",
      queryId: "due_this_month",
      name: "Due this month",
    };
    const envelope = createEntityQueryDefinitionsCatalogEnvelope([
      baseRecord,
      otherRecord,
    ]);
    const parsed = parseEntityQueryDefinitionsCatalogJson(
      JSON.stringify(envelope),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        parsed.errors
          .map((error) => `${error.path}: ${error.message}`)
          .join("\n"),
      );
    }

    expect(parsed.data.entityQueryDefinitions).toHaveLength(2);
    const names = parsed.data.entityQueryDefinitions.map((query) => query.name);
    expect(names).toContain("Upcoming payments");
    expect(names).toContain("Due this month");
  });
});
