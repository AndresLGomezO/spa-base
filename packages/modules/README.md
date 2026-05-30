# @repo/modules

Compile-time module system for optional platform extensions: entities, routes, hooks, UI extensions, and converters without modifying core.

**Default bootstrap:** [`apps/platform/app.config.ts`](../../apps/platform/app.config.ts) uses `modules: []`. Tenants use Model Builder for entities; add modules when you need code-defined entities or custom routes.

## Key exports

- `defineApp()` / `defineModule()` — module registration
- `bootstrapPlatformApp()` — hydrate all registries
- Registries: entities, routes, hooks, uiExtensions, converters
- `getRegisteredRoutes()` — module HTTP routes for API wiring

## Used by

`apps/api` and `apps/web` via `@app/platform`.

## Commands

```bash
pnpm --filter @repo/modules test
pnpm --filter @repo/modules typecheck
```

## Guide

[docs/module-extension-guide.md](../../docs/module-extension-guide.md) · [master-plans.md](../../docs/master-plans.md)
