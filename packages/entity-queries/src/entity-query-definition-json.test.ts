import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

  it("parses rates query definitions catalog", () => {
    const catalogPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../apps/api/src/admin/rates-tenant/catalogs/rates-query-definitions.json",
    );
    const text = readFileSync(catalogPath, "utf8");
    const parsed = parseEntityQueryDefinitionsCatalogJson(text);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        parsed.errors
          .map((error) => `${error.path}: ${error.message}`)
          .join("\n"),
      );
    }

    expect(parsed.data.entityQueryDefinitions).toHaveLength(35);
    const names = parsed.data.entityQueryDefinitions.map((query) => query.name);
    expect(names).toContain("Upcoming payments");
    expect(names).toContain("Active commitments");
    expect(names).toContain("Income by category");
    expect(
      parsed.data.entityQueryDefinitions.some(
        (query) =>
          query.sourceEntity === "financialItem" &&
          query.filter.children.some(
            (child) =>
              child.type === "condition" &&
              child.field === "actor.type" &&
              child.value.type === "static" &&
              child.value.value === "PROPERTY",
          ),
      ),
    ).toBe(true);
  });
});
