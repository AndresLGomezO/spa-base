# @repo/hooks

Lifecycle hook execution engine for entity CRUD events (`beforeCreate`, `afterCreate`, etc.) with structured action interpreter.

## Key exports

- `executeHooks()` / `emitHooks()` — run hook chains
- `validateHookActions()` — action schema validation
- Action types: `updateField`, `createRecord`, `sendNotification`
- Input schemas for hook CRUD API

## Hook sources

- **Module hooks** — registered at compile time via `@repo/modules`
- **Dynamic hooks** — stored in Firestore, managed via `/api/hooks`

Wired in `apps/api/src/modules/run-entity-hooks.ts` (synchronous in request path).

## Dependencies

Depends on `@repo/entities`. Used by API CRUD pipeline and hook routes.

## Commands

```bash
pnpm --filter @repo/hooks test
pnpm --filter @repo/hooks typecheck
```

## Guide

[docs/hooks-system-guide.md](../../docs/hooks-system-guide.md)
