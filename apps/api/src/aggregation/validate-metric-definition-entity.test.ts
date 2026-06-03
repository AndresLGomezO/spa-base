import { describe, expect, it } from "vitest";

import type { DefinedEntity, FieldDefinitions } from "@repo/entities";

import {
  findEntityForSourceModel,
  validateMetricDefinitionDateGranularity,
} from "./validate-metric-definition-entity.js";

const transactionEntity = {
  name: "transaction",
  metadata: {
    fields: {
      date: { type: "date" },
      categoryId: { type: "string" },
    } as FieldDefinitions,
  },
} as DefinedEntity<string, FieldDefinitions>;

describe("validateMetricDefinitionDateGranularity", () => {
  it("requires granularity for date fields in groupBy or dimensions", () => {
    expect(
      validateMetricDefinitionDateGranularity(transactionEntity, {
        groupBy: ["date"],
        dimensions: [],
        dateFieldGranularity: {},
      }),
    ).toContain("date");
  });

  it("rejects granularity on non-date fields", () => {
    expect(
      validateMetricDefinitionDateGranularity(transactionEntity, {
        groupBy: ["categoryId"],
        dimensions: [],
        dateFieldGranularity: { categoryId: "day" },
      }),
    ).toContain("categoryId");
  });

  it("accepts valid date granularity configuration", () => {
    expect(
      validateMetricDefinitionDateGranularity(transactionEntity, {
        groupBy: ["date"],
        dimensions: ["categoryId"],
        dateFieldGranularity: { date: "month" },
      }),
    ).toBeNull();
  });
});

describe("findEntityForSourceModel", () => {
  it("finds entity by name", () => {
    expect(
      findEntityForSourceModel([transactionEntity], "transaction")?.name,
    ).toBe("transaction");
  });
});
