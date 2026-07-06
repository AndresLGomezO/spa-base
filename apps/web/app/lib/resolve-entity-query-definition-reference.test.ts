import { describe, expect, it } from "vitest";

import type { EntityQueryDefinitionRecord } from "./api-client.js";
import { resolveEntityQueryDefinitionDocumentId } from "./resolve-entity-query-definition-reference.js";

const definitions: EntityQueryDefinitionRecord[] = [
  {
    id: "entity_query_abc",
    tenantId: "tenant_1",
    queryId: "income_this_month",
    name: "Income this month",
    sourceEntity: "transaction",
    filter: {
      type: "group" as const,
      combinator: "and" as const,
      children: [],
    },
    sort: [],
    limitMode: "topN" as const,
    limit: 100,
    status: "ACTIVE" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("resolveEntityQueryDefinitionDocumentId", () => {
  it("returns the document id when already resolved", () => {
    expect(
      resolveEntityQueryDefinitionDocumentId("entity_query_abc", definitions),
    ).toBe("entity_query_abc");
  });

  it("resolves by query name", () => {
    expect(
      resolveEntityQueryDefinitionDocumentId("Income this month", definitions),
    ).toBe("entity_query_abc");
  });

  it("returns undefined for empty references", () => {
    expect(
      resolveEntityQueryDefinitionDocumentId("", definitions),
    ).toBeUndefined();
  });
});
