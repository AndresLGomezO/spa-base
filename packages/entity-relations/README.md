# @repo/entity-relations

Relation validation and join collection handling for FK fields and many-to-many associations.

## Key exports

- `createRelationValidator()` — validate FK on create/update
- `createJoinCollectionHandler()` — link/unlink many-to-many
- `createEntityRelationHooks()` — CRUD lifecycle integration
- Delete semantics: `restrict`, `nullify`, `cascade`

## Relation field types

Defined in `@repo/entities` (`relation`, `joinCollection`). Wired in `apps/api/src/relations/create-relation-services.ts`.

## Dependencies

Depends on `@repo/entities`, `@repo/firestore-converters`. Used by CRUD generator.

## Commands

```bash
pnpm --filter @repo/entity-relations test
pnpm --filter @repo/entity-relations typecheck
```

## Guide

[docs/guides/relational-data-system.md](../../docs/guides/relational-data-system.md)
