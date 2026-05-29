# @repo/modules

Compile-time module system for extending the platform: entities, routes, hooks, UI extensions, and converters without modifying core.

## Key exports

- `defineApp()` / `defineModule()` — module registration
- `bootstrapPlatformApp()` — hydrate all registries
- Registries: entities, routes, hooks, uiExtensions, converters
- `getRegisteredRoutes()` — module HTTP routes for API wiring

## Sample modules

- `modules/core` — `organization`, `project`
- `modules/inventory` — `inventoryItem`, summary route

Configured in [apps/platform/app.config.ts](../../apps/platform/app.config.ts).

## Dependencies

Depends on `@repo/entities`, `@repo/hooks`. Consumed by `apps/api` and `apps/web` via `@app/platform`.

## Commands

```bash
pnpm --filter @repo/modules test
pnpm --filter @repo/modules typecheck
```

## Guide

[docs/module-extension-guide.md](../../docs/module-extension-guide.md)
