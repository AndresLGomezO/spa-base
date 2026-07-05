import { describe, expect, it } from "vitest";

import {
  collectQueryFilterFieldPaths,
  evaluateEntityQueryFilterTree,
  recordMatchesEntityQueryDefinition,
} from "./record-matches-entity-query-definition.js";
import type { EntityQueryDefinitionRecord } from "./types.js";

const transactionCatalog = [
  {
    name: "transaction",
    fields: {
      type: { type: "string", required: true, optional: false },
    },
  },
] as const;

const baseDefinition: Pick<
  EntityQueryDefinitionRecord,
  "sourceEntity" | "filter" | "parameters"
> = {
  sourceEntity: "transaction",
  parameters: [],
  filter: {
    type: "group",
    combinator: "and",
    children: [
      {
        type: "condition",
        field: "type",
        operator: "==",
        value: { type: "static", value: "INCOME" },
      },
    ],
  },
};

describe("evaluateEntityQueryFilterTree", () => {
  it("matches static equality filters", () => {
    expect(
      evaluateEntityQueryFilterTree(
        { type: "INCOME", amount: 10 },
        {
          type: "condition",
          field: "type",
          operator: "==",
          value: "INCOME",
        },
      ),
    ).toBe(true);
  });
});

describe("collectQueryFilterFieldPaths", () => {
  it("collects direct and nested filter fields", () => {
    expect(collectQueryFilterFieldPaths(baseDefinition)).toEqual(["type"]);
  });
});

describe("recordMatchesEntityQueryDefinition", () => {
  it("returns true for empty filters", async () => {
    const included = await recordMatchesEntityQueryDefinition({
      record: { type: "EXPENSE" },
      definition: {
        sourceEntity: "transaction",
        parameters: [],
        filter: { type: "group", combinator: "and", children: [] },
      },
      catalog: transactionCatalog,
      listChildRecords: async () => [],
    });

    expect(included).toBe(true);
  });

  it("evaluates direct filters without child lookups", async () => {
    const included = await recordMatchesEntityQueryDefinition({
      record: { type: "INCOME" },
      definition: baseDefinition,
      catalog: transactionCatalog,
      listChildRecords: async () => [],
    });

    expect(included).toBe(true);
  });
});
