# @repo/query-engine

Parses, validates, and executes entity list queries (filter, sort, pagination, select) with tenant isolation and RBAC integration.

## Key exports

- `createQueryEngine()` — engine factory
- `parseListQueryInput()` — HTTP query param → `QueryConfig`
- `normalizeEntityQuery()` — validated query for executor
- `applyRbacFilters()` — entity-level read gate

## Dependencies

Depends on `@repo/entities`, `@repo/firestore-converters`. Used by `apps/api` CRUD list routes.

## HTTP usage

```http
GET /api/workItem?query={"filter":[...],"sort":[...],"pagination":{"limit":20}}
```

Legacy: `?limit=20&cursor=...`

## Commands

```bash
pnpm --filter @repo/query-engine test
pnpm --filter @repo/query-engine typecheck
```

## Guide

[docs/query-engine-guide.md](../../docs/query-engine-guide.md) · [master-plans.md](../../docs/master-plans.md)
