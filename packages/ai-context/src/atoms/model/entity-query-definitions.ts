export const MODEL_ENTITY_QUERY_DEFINITIONS_ATOM_ID =
  "model.entity-query-definitions";

export function buildModelEntityQueryDefinitionsAtom(): string {
  return `# Entity query definition schema (Settings → Query Builder)

Persisted per tenant. Used by \`query-viewer\` layout components (\`entityQueryDefinitionId\`) and as metric population sources (\`sourceQueryDefinitionId\` on metric definitions).

## Portable create shape (excerpt)

\`\`\`json
{
  "name": "Active liabilities",
  "sourceEntity": "financialItem",
  "filter": {
    "type": "group",
    "combinator": "and",
    "children": [
      {
        "type": "condition",
        "field": "status",
        "operator": "eq",
        "value": "ACTIVE"
      }
    ]
  },
  "sort": [],
  "limitMode": "all",
  "status": "ACTIVE"
}
\`\`\`

## limitMode

| Value | Metric source | query-viewer |
|-------|---------------|--------------|
| \`all\` | Eligible when \`ACTIVE\` | Full result set |
| \`topN\` | **Not** eligible | Ranked slice (\`limit\` required) |

## Delete guards

Cannot delete (single or catalog replace) when:

- Any metric references \`sourceQueryDefinitionId\`

**Not guarded:** \`query-viewer\` layout bindings (\`entityQueryDefinitionId\`) — layouts may break if query is removed.

## Catalog replace

\`entity-query-definitions-catalog\` matches by \`name\`: update existing, create new, delete missing. Deletes blocked when metrics reference the query.

Envelope kind: \`entity-query-definitions-catalog\`.
`;
}
