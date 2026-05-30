# @repo/dynamic-entities

Runtime entity definitions: convert Firestore definition records to `DefinedEntity`, register in per-tenant registry, validate schema evolution.

## Key exports

- `defineEntityFromRecord()` — record → entity definition
- `registerDynamicEntity()` / `resolveEntity()` — runtime registry
- `validateDefinitionEvolution()` — safe field changes
- `createEntityDefinitionInputSchema()` — API input validation
- `clearDynamicEntitiesForTenant()` — cache invalidation

## Storage

Tenant-scoped Firestore collection `entity_definitions`. Loaded by `EntityRuntimeContext` in API with TTL cache.

## Dependencies

Depends on `@repo/entities`. Used by entity-definition routes and dynamic CRUD registration.

## Commands

```bash
pnpm --filter @repo/dynamic-entities test
pnpm --filter @repo/dynamic-entities typecheck
```

## Guide

[docs/dynamic-entity-builder-guide.md](../../docs/dynamic-entity-builder-guide.md) · [master-plans.md](../../docs/master-plans.md)
