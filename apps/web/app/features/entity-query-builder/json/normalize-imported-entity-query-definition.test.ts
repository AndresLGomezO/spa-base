import { describe, expect, it } from "vitest";

import { ENTITY_QUERY_AGGREGATED_EXAMPLE } from "./entity-query-definition-json-examples";
import { normalizeImportedEntityQueryDefinitionForEdit } from "./normalize-imported-entity-query-definition";

describe("normalizeImportedEntityQueryDefinitionForEdit", () => {
  it("preserves the current query name and source entity", () => {
    const result = normalizeImportedEntityQueryDefinitionForEdit({
      data: ENTITY_QUERY_AGGREGATED_EXAMPLE,
      existingName: "My existing query",
      existingSourceEntity: "paymentSchedule",
    });

    expect(result.data.name).toBe("My existing query");
    expect(result.data.sourceEntity).toBe("paymentSchedule");
    expect(result.data.queryMode).toBe("aggregated");
    expect(result.preservedIdentityFields).toEqual(["name", "sourceEntity"]);
  });

  it("returns no preserved fields when import already matches", () => {
    const result = normalizeImportedEntityQueryDefinitionForEdit({
      data: ENTITY_QUERY_AGGREGATED_EXAMPLE,
      existingName: ENTITY_QUERY_AGGREGATED_EXAMPLE.name,
      existingSourceEntity: ENTITY_QUERY_AGGREGATED_EXAMPLE.sourceEntity,
    });

    expect(result.preservedIdentityFields).toEqual([]);
  });
});
