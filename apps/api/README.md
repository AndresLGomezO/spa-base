# API (`apps/api`)

Fastify HTTP API for the multi-tenant platform. Handles auth validation, auto-generated CRUD, query engine, entity definitions, hooks, roles, modules, and platform admin.

**Handoff:** [docs/phase-2-platform-handoff.md](../../docs/phase-2-platform-handoff.md)

---

## Routes overview

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/validate` | Bearer + App Check | Session + resolved permissions |
| POST | `/auth/select-tenant` | Bearer + App Check | Set `tenantId` custom claim |

Auth response includes RBAC fields when tenant is active:

```json
{
  "uid": "...",
  "email": "...",
  "permissions": ["organization.read", "project.read"],
  "isSuperAdmin": false,
  "tenantId": "tenant_dev_1",
  "availableTenants": ["tenant_dev_1"]
}
```

After `POST /auth/select-tenant`, client must call `getIdToken(true)` to refresh the JWT.

### Entity catalog

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/entities` | Any `*.read` |

Returns serialized entity definitions (static modules + tenant dynamic entities) with UI metadata and field access maps.

### CRUD (per entity)

Static entities: `organization`, `project`, `inventoryItem`, plus tenant dynamic entities registered at runtime.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/{entity}` | List — `?limit=&cursor=` or `?query=` JSON |
| GET | `/api/{entity}/:id` | Get one |
| POST | `/api/{entity}` | Create |
| PUT | `/api/{entity}/:id` | Update |
| DELETE | `/api/{entity}/:id` | Delete |

Query JSON example:

```http
GET /api/project?query={"filter":[{"field":"organizationId","operator":"==","value":"org_1"}],"pagination":{"limit":20}}
```

Response envelope:

```json
{ "data": ..., "error": null }
```

Errors:

```json
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

See [docs/crud-api.http](./docs/crud-api.http) for examples.

### Entity definitions (Model Builder)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/entity-definitions` | `entityDefinition.read` |
| POST | `/api/entity-definitions` | `entityDefinition.create` |
| PATCH | `/api/entity-definitions/:id` | `entityDefinition.update` |

Superadmin may pass `?tenantId=` query param for cross-tenant operations.

### Hooks

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/hooks` | `hook.read` |
| POST | `/api/hooks` | `hook.create` |
| PATCH | `/api/hooks/:id` | `hook.update` |

### Tenant roles

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/roles` | `role.read` |
| POST | `/api/roles` | `role.create` |
| PATCH | `/api/roles/:id` | `role.update` |

### Module routes

Registered from `@repo/modules` at bootstrap. Example:

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/modules/inventory/summary` | `inventoryItem.read` |

### Platform admin (superadmin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/roles` | Global role templates |
| GET | `/admin/tenants` | Tenant registry |
| POST | `/admin/tenants` | Create tenant |
| PATCH | `/admin/tenants/:id` | Update tenant |
| GET | `/admin/users` | Paginated users |
| PATCH | `/admin/users/:uid` | Update `{ tenants: Record<string, string[]> }` |

---

## Authentication

All `/api/*` and `/admin/*` routes require:

```
Authorization: Bearer <Firebase ID token>
X-Firebase-AppCheck: <App Check token>
```

### Tenant isolation

CRUD requires **`tenantId` custom claim** on the JWT. API injects tenant on writes; all reads filtered by tenant. Clients must never send `tenantId` in request body.

Set claim in development:

```js
import { getAuth } from "firebase-admin/auth";
await getAuth().setCustomUserClaims(uid, { tenantId: "tenant_dev_1" });
```

---

## Persistence

Collection path: `tenants/{tenantId}/{collection}/{documentId}`

| Entity | Collection example |
|--------|-------------------|
| organization | `tenants/tenant_a/organizations/{id}` |
| project | `tenants/tenant_a/projects/{id}` |
| entity_definitions | `tenants/tenant_a/entity_definitions/{id}` |

### Local development

```bash
pnpm emulators          # from repo root
pnpm --filter api dev
```

Set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` (see `.env.dev.example`).

Integration tests use in-memory repositories via `buildServer({ repositories })`. Firestore integration tests require the emulator.

---

## RBAC

Permissions: `{entity}.{action}` (`read`, `create`, `update`, `delete`).

Built-in tenant roles: `admin` (`*`), `editor`, `viewer`. Custom tenant roles at `tenants/{tenantId}/roles/{roleId}` with optional field rules.

Seed user roles on Firestore `users/{uid}`:

```json
{
  "platformRole": null,
  "tenants": { "tenant_dev_1": ["admin"] }
}
```

Superadmin: `"platformRole": "superadmin"`.

See [packages/rbac/README.md](../../packages/rbac/README.md) and [docs/advanced-rbac-guide.md](../../docs/advanced-rbac-guide.md).

User access profiles cached 60s (`CACHE_TTL_MS`); invalidated on admin user PATCH.

---

## Performance and middleware

| Feature | Config |
|---------|--------|
| Gzip | `@fastify/compress` (global) |
| Rate limit | `API_RATE_LIMIT_MAX`, `API_RATE_LIMIT_TIME_WINDOW_MS` (disabled in `NODE_ENV=test`) |
| Timing logs | `ENABLE_PERF_LOGS` — logs `rbacMs`, `queryMs`, `hooksMs`, `totalMs` |
| Strict pagination | `STRICT_QUERY_PAGINATION` (default `true` in test) |
| Cache TTL | `CACHE_TTL_MS` (default 60000) |

See [docs/performance-scaling-guide.md](../../docs/performance-scaling-guide.md).

---

## Superadmin bootstrap

```
PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS=you@example.com
```

Promotes email to superadmin on **first** user document creation. Dev tenants `tenant_dev_1` and `tenant_dev_2` seeded on startup.

---

## Project layout

```
src/
  auth/              JWT + App Check, tenant claim
  config/env.ts      Environment schema
  crud/              CRUD generator, response envelope
  entities/          Catalog, definitions, runtime context
  hooks/             Hook routes + runtime
  modules/           Module route registration, entity hooks
  observability/     Request timing
  query/             Query engine wiring
  rbac/              Permissions, caches, guards
  relations/         FK + join validation
  roles/             Tenant role CRUD
  routes/            Auth, admin
  server.ts          Fastify bootstrap
```

---

## Commands

```bash
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api typecheck
```

---

## Related docs

- [src/crud/README.md](./src/crud/README.md)
- [docs/entity-system-guide.md](../../docs/entity-system-guide.md)
- [docs/query-engine-guide.md](../../docs/query-engine-guide.md)
- [docs/e2e-validation-runbook.md](../../docs/e2e-validation-runbook.md)
