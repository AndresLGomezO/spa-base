import { describe, expect, it } from "vitest";

import { resolveTemporalPreset } from "./temporal.js";
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

const paymentScheduleCatalog = [
  {
    name: "paymentSchedule",
    fields: {
      status: { type: "string", required: true, optional: false },
      dueDate: { type: "date", required: true, optional: false },
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

  it("matches date-only dueDate against temporal day bounds", async () => {
    const now = new Date("2026-07-06T14:30:00.000Z");
    const definition: Pick<
      EntityQueryDefinitionRecord,
      "sourceEntity" | "filter" | "parameters"
    > = {
      sourceEntity: "paymentSchedule",
      parameters: [],
      filter: {
        type: "group",
        combinator: "and",
        children: [
          {
            type: "condition",
            field: "status",
            operator: "==",
            value: { type: "static", value: "UPCOMING" },
          },
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
        ],
      },
    };

    const included = await recordMatchesEntityQueryDefinition({
      record: { status: "UPCOMING", dueDate: "2026-07-06" },
      definition,
      catalog: paymentScheduleCatalog,
      listChildRecords: async () => [],
      options: { now },
    });

    expect(included).toBe(true);
    expect(resolveTemporalPreset("startOfDay", now)).toBe(
      "2026-07-06T00:00:00.000Z",
    );
  });
});
