import {
  createEntityQueryDefinitionEnvelope,
  ENTITY_QUERY_DEFINITIONS_CATALOG_JSON_KIND,
  ENTITY_QUERY_DEFINITION_JSON_VERSION,
  type CreateEntityQueryDefinitionInput,
  type EntityQueryDefinitionsCatalogEnvelope,
} from "@repo/entity-queries/browser";

export const ENTITY_QUERY_AGGREGATED_EXAMPLE: CreateEntityQueryDefinitionInput =
  {
    name: "Top outflow category (period)",
    description:
      "Highest expense/payment category for a parameterized month window.",
    sourceEntity: "transaction",
    queryMode: "aggregated",
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
        {
          type: "condition",
          field: "type",
          operator: "in",
          value: { type: "static", value: ["EXPENSE", "PAYMENT"] },
        },
      ],
    },
    sort: [],
    groupBy: ["categoryId"],
    aggregations: [{ operation: "SUM", field: "amount" }],
    groupSort: [{ field: "sum_amount", direction: "desc" }],
    groupLimit: 1,
    limitMode: "all",
    limit: 20,
    status: "ACTIVE",
  };

export function createEntityQueryDefinitionImportExampleEnvelope(input?: {
  readonly name?: string;
  readonly sourceEntity?: string;
}): ReturnType<typeof createEntityQueryDefinitionEnvelope> {
  return createEntityQueryDefinitionEnvelope({
    ...ENTITY_QUERY_AGGREGATED_EXAMPLE,
    name: input?.name ?? ENTITY_QUERY_AGGREGATED_EXAMPLE.name,
    sourceEntity:
      input?.sourceEntity ?? ENTITY_QUERY_AGGREGATED_EXAMPLE.sourceEntity,
  });
}

export function createEntityQueryDefinitionsCatalogImportExampleEnvelope(): EntityQueryDefinitionsCatalogEnvelope {
  return {
    kind: ENTITY_QUERY_DEFINITIONS_CATALOG_JSON_KIND,
    version: ENTITY_QUERY_DEFINITION_JSON_VERSION,
    exportedAt: new Date().toISOString(),
    entityQueryDefinitions: [ENTITY_QUERY_AGGREGATED_EXAMPLE],
  };
}
