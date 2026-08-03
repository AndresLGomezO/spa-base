# Codebase Map

Annotated file index for the platform monorepo. Use this to locate code before extending a capability.

---

## Monorepo tree

```
project-base/
├── apps/
│   ├── api/                 Fastify HTTP server
│   ├── web/                 React Router 7 SPA
│   └── platform/            defineApp (empty modules — dynamic entities only)
├── modules/                 (reserved for optional extension modules)
├── packages/                Shared libraries (see below)
└── docs/                    guides/, reference/, ai-platform/, infrastructure/, ui-design-manual/
```

---

## Wiring points (start here)

| Concern | File | Role |
|---------|------|------|
| API bootstrap | [apps/api/src/server.ts](../../apps/api/src/server.ts) | Registers plugins, auth, CRUD, admin, modules |
| App modules | [apps/platform/app.config.ts](../../apps/platform/app.config.ts) | `platformApp` module list |
| Platform bootstrap | [apps/platform/bootstrap.ts](../../apps/platform/bootstrap.ts) | Hydrates registries for API + web |
| Web routes | [apps/web/app/routes.ts](../../apps/web/app/routes.ts) | Route config entry |
| Entity routes | [apps/web/app/routing/entity-routes.ts](../../apps/web/app/routing/entity-routes.ts) | `/app/:entity` patterns |
| Query client | [apps/web/app/query/query-client.ts](../../apps/web/app/query/query-client.ts) | TanStack Query defaults |
| API env | [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts) | Cache, rate limit, perf flags |

---

## Phase 1 foundation

### Entity system

| File | Purpose |
|------|---------|
| [packages/entities/src/defineEntity.ts](../../packages/entities/src/defineEntity.ts) | Core `defineEntity()` |
| [packages/entities/src/ui/](../../packages/entities/src/ui/) | UI config types |
| [packages/dynamic-entities/src/](../../packages/dynamic-entities/src/) | Runtime entity definitions |
| [packages/shared-types/src/entities/](../../packages/shared-types/src/entities/) | Static entity exports (optional modules) |

### DAL / Firestore

| File | Purpose |
|------|---------|
| [packages/firestore-converters/src/entity/](../../packages/firestore-converters/src/entity/) | Repository ports, converters |
| [packages/gcp-firebase/src/](../../packages/gcp-firebase/src/) | Admin SDK repository implementations |
| [packages/gcp-firebase/src/firestore-entity-query-executor.ts](../../packages/gcp-firebase/src/firestore-entity-query-executor.ts) | Firestore query execution + index hints |

### CRUD API

| File | Purpose |
|------|---------|
| [apps/api/src/crud/register-crud-routes.ts](../../apps/api/src/crud/register-crud-routes.ts) | Route registration, list query integration |
| [apps/api/src/crud/response.ts](../../apps/api/src/crud/response.ts) | `{ data, error }` envelope |
| [apps/api/src/crud/errors.ts](../../apps/api/src/crud/errors.ts) | API error codes |

### Basic RBAC

| File | Purpose |
|------|---------|
| [packages/rbac/src/resolve-permissions.ts](../../packages/rbac/src/resolve-permissions.ts) | Permission resolution |
| [apps/api/src/rbac/load-request-permissions.ts](../../apps/api/src/rbac/load-request-permissions.ts) | Per-request permission load |
| [apps/api/src/rbac/create-require-permission.ts](../../apps/api/src/rbac/create-require-permission.ts) | Route guard factory |
| [apps/api/src/auth/authenticate-request.ts](../../apps/api/src/auth/authenticate-request.ts) | JWT + App Check |

### Frontend entity UI

| File | Purpose |
|------|---------|
| [apps/web/app/components/entity/EntityPage.tsx](../../apps/web/app/components/entity/EntityPage.tsx) | List page shell |
| [apps/web/app/components/entity/EntityExpandableTable.tsx](../../apps/web/app/components/entity/EntityExpandableTable.tsx) | Virtualized expandable table + filters |
| [apps/web/app/components/entity/EntityForm.tsx](../../apps/web/app/components/entity/EntityForm.tsx) | Create/edit form |
| [apps/web/app/hooks/useEntity.ts](../../apps/web/app/hooks/useEntity.ts) | TanStack Query entity hook |

### Routing

| File | Purpose |
|------|---------|
| [apps/web/app/routing/RouteGuards.tsx](../../apps/web/app/routing/RouteGuards.tsx) | Auth, tenant, permission guards |
| [apps/web/app/routing/useAccessibleNavItems.ts](../../apps/web/app/routing/useAccessibleNavItems.ts) | Sidebar entity list |

---

## Phase 2 capabilities

### 10.0 Query Engine

| File | Purpose |
|------|---------|
| [packages/query-engine/src/parse-query-config.ts](../../packages/query-engine/src/parse-query-config.ts) | Parse + validate query JSON |
| [packages/query-engine/src/create-query-engine.ts](../../packages/query-engine/src/create-query-engine.ts) | Engine factory |
| [packages/query-engine/src/apply-query-security.ts](../../packages/query-engine/src/apply-query-security.ts) | Tenant filter injection |
| [apps/api/src/query/create-query-services.ts](../../apps/api/src/query/create-query-services.ts) | API wiring |

### 10.1 Relational Data

| File | Purpose |
|------|---------|
| [packages/entity-relations/src/](../../packages/entity-relations/src/) | Relation validation, join handler |
| [apps/api/src/relations/create-relation-services.ts](../../apps/api/src/relations/create-relation-services.ts) | CRUD relation hooks |
| [apps/api/src/entities/register-entity-relation-routes.ts](../../apps/api/src/entities/register-entity-relation-routes.ts) | M2M relation sync API |
| [apps/web/app/components/entity/RelationPicker.tsx](../../apps/web/app/components/entity/RelationPicker.tsx) | FK picker UI |
| [apps/web/app/components/entity/ManyToManyRelationPicker.tsx](../../apps/web/app/components/entity/ManyToManyRelationPicker.tsx) | M2M picker UI |
| [apps/web/app/hooks/useOneToManyColumnData.ts](../../apps/web/app/hooks/useOneToManyColumnData.ts) | One-to-many reverse lookup in tables |

### 10.2 Advanced UI Builder

| File | Purpose |
|------|---------|
| [packages/ui-builder/src/](../../packages/ui-builder/src/) | View/form/query resolution |
| [apps/web/app/components/entity/field-component-registry.tsx](../../apps/web/app/components/entity/field-component-registry.tsx) | Custom field components |
| [apps/web/app/components/entity/view-component-registry.tsx](../../apps/web/app/components/entity/view-component-registry.tsx) | Custom view types |
| [apps/api/src/entities/list-entities.route.ts](../../apps/api/src/entities/list-entities.route.ts) | Catalog API |

### 10.3 Module Extension

| File | Purpose |
|------|---------|
| [packages/modules/src/define-module.ts](../../packages/modules/src/define-module.ts) | Module definition |
| [packages/modules/src/registry/](../../packages/modules/src/registry/) | Entity, route, hook, UI registries |
| [apps/api/src/modules/register-module-routes.ts](../../apps/api/src/modules/register-module-routes.ts) | Module HTTP routes (when modules registered) |

### 10.4 Hooks

| File | Purpose |
|------|---------|
| [packages/hooks/src/interpret-data-hook.ts](../../packages/hooks/src/interpret-data-hook.ts) | Data-hook interpreter / runner |
| [apps/api/src/hooks/hook-runtime-context.ts](../../apps/api/src/hooks/hook-runtime-context.ts) | Firestore + module hook merge |
| [apps/api/src/hooks/register-hook-routes.ts](../../apps/api/src/hooks/register-hook-routes.ts) | `/api/hooks` CRUD |
| [apps/api/src/modules/run-entity-hooks.ts](../../apps/api/src/modules/run-entity-hooks.ts) | CRUD lifecycle integration |
| [apps/web/app/features/data-hooks/DataHooksView.tsx](../../apps/web/app/features/data-hooks/DataHooksView.tsx) | Automation UI |

### 10.5 Advanced RBAC

| File | Purpose |
|------|---------|
| [packages/rbac/src/field-permissions.ts](../../packages/rbac/src/field-permissions.ts) | Field access map |
| [apps/api/src/roles/register-role-routes.ts](../../apps/api/src/roles/register-role-routes.ts) | `/api/roles` CRUD |
| [apps/web/app/components/roles/](../../apps/web/app/components/roles/) | RoleManager, FieldPermissionEditor |
| [apps/api/src/rbac/user-access-cache.ts](../../apps/api/src/rbac/user-access-cache.ts) | User profile TTL cache |

### 10.6 Admin Dashboard

| File | Purpose |
|------|---------|
| [apps/web/app/components/settings/UserManagement.tsx](../../apps/web/app/components/settings/UserManagement.tsx) | Tenant user invites + role assignment |
| [apps/web/app/components/platform/CurrentTenantPanel.tsx](../../apps/web/app/components/platform/CurrentTenantPanel.tsx) | Active tenant management |
| [apps/web/app/components/platform/TenantAppearanceEditor.tsx](../../apps/web/app/components/platform/TenantAppearanceEditor.tsx) | Tenant branding editor |
| [apps/web/app/theme/TenantBrandingProvider.tsx](../../apps/web/app/theme/TenantBrandingProvider.tsx) | Applies `appearance` CSS vars to `:root` |
| [packages/theme/src/tenant-overrides.ts](../../packages/theme/src/tenant-overrides.ts) | `appearanceToCssVariables`, presets, override groups |
| [packages/theme/src/semantics.css](../../packages/theme/src/semantics.css) | Palette → semantic token mappings |
| [packages/theme/README.md](../../packages/theme/README.md) | Theme package API; links to full branding guide |
| [apps/web/app/lib/admin-client.ts](../../apps/web/app/lib/admin-client.ts) | Admin API client |
| [apps/api/src/routes/admin.routes.ts](../../apps/api/src/routes/admin.routes.ts) | `/admin/*` superadmin routes |
| [apps/web/app/routes/settings/](../../apps/web/app/routes/settings/) | Control Plane pages |

### 10.7 Performance & Scaling

| File | Purpose |
|------|---------|
| [packages/shared-types/src/cache/create-ttl-cache.ts](../../packages/shared-types/src/cache/create-ttl-cache.ts) | TTL cache utility |
| [apps/api/src/rbac/role-catalog.ts](../../apps/api/src/rbac/role-catalog.ts) | Role catalog cache |
| [apps/api/src/entities/entity-runtime-context.ts](../../apps/api/src/entities/entity-runtime-context.ts) | Definition load cache + repository invalidation on schema sync |
| [apps/api/src/observability/request-timing.ts](../../apps/api/src/observability/request-timing.ts) | Timing logs |
| [apps/web/app/routes/private-layout.tsx](../../apps/web/app/routes/private-layout.tsx) | Fixed viewport shell; scrollable main body |
| [apps/web/app/hooks/useDebouncedValue.ts](../../apps/web/app/hooks/useDebouncedValue.ts) | Filter debounce |
| [apps/web/app/entities/use-refresh-entity-catalog-on-mount.ts](../../apps/web/app/entities/use-refresh-entity-catalog-on-mount.ts) | Catalog refresh on entity routes |

### 10.8 Dynamic Entity Builder

| File | Purpose |
|------|---------|
| [packages/dynamic-entities/src/define-entity-from-record.ts](../../packages/dynamic-entities/src/define-entity-from-record.ts) | Record → entity |
| [packages/dynamic-entities/src/registry.ts](../../packages/dynamic-entities/src/registry.ts) | Runtime registry |
| [apps/api/src/entities/register-entity-definition-routes.ts](../../apps/api/src/entities/register-entity-definition-routes.ts) | Definition API |
| [apps/api/src/entities/register-dynamic-entity-crud-routes.ts](../../apps/api/src/entities/register-dynamic-entity-crud-routes.ts) | Lazy CRUD registration |
| [apps/web/app/components/data-models/](../../apps/web/app/components/data-models/) | Model Builder UI |

---

## Where to change X

| Task | Primary files |
|------|---------------|
| Add static entity | Optional: `modules/*/src/entities/`, register in module, add to `app.config.ts` |
| Add module | Create `modules/new-module/`, `defineModule()`, add to `platformApp.modules` |
| Add API route (non-entity) | Module `routes` registry or new Fastify plugin in `server.ts` |
| Add hook action type | `packages/hooks/src/actions/`, `validateHookActions` |
| Add UI field component | `field-component-registry.tsx`, optionally module UI extension |
| Add UI view type | `view-component-registry.tsx`, `@repo/ui-builder` resolver |
| Add query operator | `packages/query-engine/src/parse-query-config.ts`, Firestore executor |
| Add permission check | Entity permissions auto-generated; custom in `@repo/rbac` |
| Add Firestore collection | `packages/firestore-converters`, `packages/gcp-firebase`, guide |
| Change cache TTL | `CACHE_TTL_MS` env, `createTtlCache` call sites |
| Add admin page | `apps/web/app/routes/settings/`, Control Plane nav in private layout |
| Change tenant colors / theme | `packages/theme` semantics + `TenantAppearanceEditor`; guide: [theme-and-tenant-branding-guide.md](./theme-and-tenant-branding.md) |
| Add semantic color token | `packages/theme/src/semantics.css`, `dark.css`, `@repo/ui` components |

---

## Test file locations

| Area | Pattern |
|------|---------|
| API integration | `apps/api/src/**/*.test.ts`, `*.integration.test.ts` |
| Web components | `apps/web/app/**/*.test.tsx` |
| Packages | `packages/*/src/**/*.test.ts` |
| CRUD comprehensive | [apps/api/src/crud/crud.routes.test.ts](../../apps/api/src/crud/crud.routes.test.ts) |

Run: `pnpm test` from repo root.

---

## App READMEs

| Path | Contents |
|------|----------|
| [apps/api/README.md](../../apps/api/README.md) | Routes, auth, env |
| [apps/web/README.md](../../apps/web/README.md) | Web dev, routing, Control Plane |
| [apps/api/src/crud/README.md](../../apps/api/src/crud/README.md) | CRUD generator design |
| [apps/web/app/routing/README.md](../../apps/web/app/routing/README.md) | Route guards |
| [theme-and-tenant-branding.md](./theme-and-tenant-branding.md) | Tenant theme tokens and Appearance editor |
| [packages/theme/README.md](../../packages/theme/README.md) | `@repo/theme` exports and file layout |
| [apps/web/app/components/entity/README.md](../../apps/web/app/components/entity/README.md) | Entity UI extension |
| [apps/web/app/components/admin/README.md](../../apps/web/app/components/admin/README.md) | Admin components |
