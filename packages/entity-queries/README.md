# @repo/entity-queries

Tenant-wide **entity query definitions**: named filters, sort, limits, and temporal value presets that resolve to `QueryConfig` at runtime.

## Filter tree (AND/OR groups)

Definitions store a recursive **filter tree** on the `filter` field (root is always a group):

```ts
type EntityQueryFilterNode =
  | { type: "condition"; field: string; operator: ...; value: EntityQueryFilterValue }
  | { type: "group"; combinator: "and" | "or"; children: EntityQueryFilterNode[] };
```

Legacy flat `filters[]` arrays are migrated on read to an AND group of condition nodes.

Constraints (validated on create/patch):

- Max depth **10**
- At least one child per group
- Max **30** OR disjunctions (Firestore limit)
- `in` operator rules unchanged (scalar vs array value)

`buildQueryConfigFromDefinition` resolves temporal presets on condition nodes and outputs a `FilterNode` tree for `@repo/query-engine`.

## Relation field filters

Filter definitions can use dot paths on related entities (e.g. `contractTerms.effectiveDate`, `provider.name`). The query engine only accepts top-level fields on the source entity, so callers must expand relation filters before `listEntity`:

1. `expandRelationFiltersInTree` — walks the filter tree, runs child-entity subqueries per relation condition, and rewrites each branch (groups preserved).
2. `buildExpandedQueryConfig` — merges the expanded tree with sort, select, and pagination from the definition.

Empty child subqueries become `id in ["__entity_query_no_match__"]` (OR branches may still match; AND subtrees fail).

Temporal presets resolve in UTC via `resolveEntityQueryFilterValue` during expansion.

Stored definitions keep dot paths in condition `field` values.

## Collections

- Firestore: `__entity_query_definitions` (per tenant)

## Phase 2 — UI-builder consumption

Runtime widgets will reference saved definitions via `EntityQueryDefinitionReference`:

```ts
interface EntityQueryDefinitionReference {
  readonly entityQueryDefinitionId: string;
}
```

Planned `query-viewer` UI-builder component work:

1. Add `query-viewer` to `UiComponentKind` in `@repo/ui-builder-core`
2. Renderer fetches items using `buildQueryConfigFromDefinition` + `listEntity`
3. Expose `items[]` on renderer context for child layout bindings

Definition IDs are stable across tenants; use `entityQueryDefinitionId` from list/create API responses.
