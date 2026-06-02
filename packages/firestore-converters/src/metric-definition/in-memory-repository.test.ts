import { describe, expect, it } from "vitest";

import { createInMemoryMetricDefinitionRepository } from "./in-memory-repository.js";

describe("createInMemoryMetricDefinitionRepository", () => {
  it("generates unique target collections per metric", async () => {
    const repository = createInMemoryMetricDefinitionRepository();
    const base = {
      name: "Loan Total",
      sourceModel: "loan",
      filters: [],
      groupBy: [],
      dimensions: [],
      aggregations: [{ field: "amount", operation: "SUM" as const }],
      schemaVersionDependency: 1,
      fieldsDependency: ["amount"],
      status: "ACTIVE" as const,
      version: 1,
    };

    const first = await repository.create("tenant_a", base);
    const second = await repository.create("tenant_a", {
      ...base,
      name: "Loan Total",
    });

    expect(first.target.collection).toBe(first.id);
    expect(second.target.collection).toBe(second.id);
    expect(first.target.collection).not.toBe(second.target.collection);
  });
});
