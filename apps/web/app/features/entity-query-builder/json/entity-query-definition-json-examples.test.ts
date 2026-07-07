import { describe, expect, it } from "vitest";

import {
  createEntityQueryDefinitionImportExampleEnvelope,
  createEntityQueryDefinitionsCatalogImportExampleEnvelope,
  ENTITY_QUERY_AGGREGATED_EXAMPLE,
} from "./entity-query-definition-json-examples";
import { validateEntityQueryDefinitionImport } from "@repo/entity-queries/browser";

describe("entity-query-definition-json-examples", () => {
  it("produces a valid aggregated single-query import envelope", () => {
    const envelope = createEntityQueryDefinitionImportExampleEnvelope();
    const parsed = validateEntityQueryDefinitionImport(
      JSON.stringify(envelope, null, 2),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.queryMode).toBe("aggregated");
      expect(parsed.data.groupBy).toEqual(["categoryId"]);
      expect(parsed.data.groupLimit).toBe(1);
    }
  });

  it("uses provided name and source entity in single-query import envelope", () => {
    const envelope = createEntityQueryDefinitionImportExampleEnvelope({
      name: "My query",
      sourceEntity: "paymentSchedule",
    });

    expect(envelope.data.name).toBe("My query");
    expect(envelope.data.sourceEntity).toBe("paymentSchedule");
    expect(envelope.data.queryMode).toBe("aggregated");
  });

  it("produces a valid aggregated catalog import envelope", () => {
    const envelope = createEntityQueryDefinitionsCatalogImportExampleEnvelope();

    expect(envelope.entityQueryDefinitions).toHaveLength(1);
    expect(envelope.entityQueryDefinitions[0]?.name).toBe(
      ENTITY_QUERY_AGGREGATED_EXAMPLE.name,
    );
  });
});
