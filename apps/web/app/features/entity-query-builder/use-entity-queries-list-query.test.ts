import { describe, expect, it } from "vitest";

import type { EntityQueryDefinitionRecord } from "../../lib/api-client";
import {
  buildEntityQueriesListQueryState,
  filterEntityQueryDefinitions,
  sortEntityQueryDefinitions,
} from "./use-entity-queries-list-query";

const baseDefinition: EntityQueryDefinitionRecord = {
  id: "entity_query_1",
  tenantId: "tenant_a",
  queryId: "upcoming_payments",
  name: "Upcoming payments",
  sourceEntity: "transaction",
  filter: { type: "group", combinator: "and", children: [] },
  sort: [],
  limitMode: "topN",
  limit: 20,
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("entity queries list query", () => {
  it("filters by search, status, query mode, and entity", () => {
    const definitions: EntityQueryDefinitionRecord[] = [
      baseDefinition,
      {
        ...baseDefinition,
        id: "entity_query_2",
        queryId: "paused_summary",
        name: "Paused summary",
        sourceEntity: "account",
        queryMode: "aggregated",
        status: "PAUSED",
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
    ];

    const query = buildEntityQueriesListQueryState(
      new URLSearchParams({
        q: "paused",
        status: "PAUSED",
        queryMode: "aggregated",
        entity: "account",
      }),
    );

    expect(filterEntityQueryDefinitions(definitions, query)).toEqual([
      definitions[1],
    ]);
  });

  it("sorts by source entity and updated date", () => {
    const definitions: EntityQueryDefinitionRecord[] = [
      baseDefinition,
      {
        ...baseDefinition,
        id: "entity_query_2",
        queryId: "account_query",
        name: "Account query",
        sourceEntity: "account",
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
    ];

    expect(
      sortEntityQueryDefinitions(definitions, "sourceEntity").map(
        (definition) => definition.id,
      ),
    ).toEqual(["entity_query_2", "entity_query_1"]);

    expect(
      sortEntityQueryDefinitions(definitions, "updatedDesc").map(
        (definition) => definition.id,
      ),
    ).toEqual(["entity_query_2", "entity_query_1"]);
  });
});
