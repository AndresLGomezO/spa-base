export const MODEL_METRIC_DEFINITIONS_ATOM_ID = "model.metric-definitions";

export function buildModelMetricDefinitionsAtom(): string {
  return `# Metric definition schema (Settings → Metrics)

Persisted per tenant in \`__metrics_definitions\`. Layout components reference definitions by \`metricDefinitionId\` only.

## Source modes

| Mode | Fields | Population |
|------|--------|--------------|
| Entity | \`sourceModel\` | All entity records, optionally narrowed by metric \`filters[]\` |
| Custom query | \`sourceQueryDefinitionId\` + \`sourceModel\` | Records matching saved query (\`limitMode: "all"\`, \`ACTIVE\`) |

When \`sourceQueryDefinitionId\` is set:

- \`sourceModel\` must equal the query's \`sourceEntity\`
- Metric \`filters[]\` are ignored (query filter defines membership)
- \`fieldsDependency\` includes query filter field paths (API merges on create/update)
- \`topN\` queries are rejected as metric sources

## Portable create shape (excerpt)

\`\`\`json
{
  "name": "Active liabilities total",
  "sourceModel": "financialItem",
  "sourceQueryDefinitionId": "active_liabilities",
  "aggregations": [{ "operation": "SUM", "field": "currentBalance" }],
  "schemaVersionDependency": 1,
  "status": "ACTIVE"
}
\`\`\`

Entity-only example (no \`sourceQueryDefinitionId\`):

\`\`\`json
{
  "name": "Total income",
  "sourceModel": "transaction",
  "filters": [{ "field": "type", "operator": "eq", "value": "INCOME" }],
  "aggregations": [{ "operation": "SUM", "field": "amount" }],
  "schemaVersionDependency": 1
}
\`\`\`

## Runtime

- Events match on \`sourceModel\` (entity CRUD)
- Query-backed metrics additionally evaluate \`recordMatchesEntityQueryDefinition\` before applying deltas
- Backfill lists all \`sourceModel\` documents, then filters by query membership

## Delete guards

Custom queries referenced by \`sourceQueryDefinitionId\` cannot be deleted (single DELETE or catalog replace) until metrics are removed or repointed.

## Related JSON specs

- Envelope: \`metric-definition\` / \`metric-definitions-catalog\`
- Query catalog: \`entity-query-definitions-catalog\` (import queries before query-backed metrics)
`;
}
