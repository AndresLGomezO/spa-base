# @repo/ui-builder

Interprets entity UI metadata into table columns, form sections, filters, and query configs. Bridges API catalog to React components.

## Key exports

- `getTableColumns()` / `getViewFilters()` — list view resolution
- `resolveCreateForm()` / `resolveEditForm()` — form layout
- `buildListQueryConfig()` — filter/sort → query engine config
- `createUiPermissionAdapter()` — field visibility from RBAC

## Consumers

- `apps/web/app/components/entity/` — EntityTable, EntityForm
- `apps/api` — merges module UI extensions in catalog route

Entity UI config defined in `@repo/entities` or dynamic definition records.

## Dependencies

Depends on `@repo/entities`, `@repo/query-engine` types. Does not import React.

## Commands

```bash
pnpm --filter @repo/ui-builder test
pnpm --filter @repo/ui-builder typecheck
```

## Guide

[docs/guides/advanced-ui-builder.md](../../docs/guides/advanced-ui-builder.md)
