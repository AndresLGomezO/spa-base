# API (`apps/api`)

Fastify HTTP API for the multi-tenant platform. Handles auth validation, auto-generated CRUD, query engine, entity definitions, hooks, roles, modules, and platform admin.

**Handoff:** [docs/phase-2-platform-handoff.md](../../docs/phase-2-platform-handoff.md)

---

## Routes overview

### Auth

| Method | Path                  | Auth               | Description                    |
| ------ | --------------------- | ------------------ | ------------------------------ |
| GET    | `/auth/validate`      | Bearer + App Check | Session + resolved permissions |
| POST   | `/auth/select-tenant` | Bearer + App Check | Set `tenantId` custom claim    |

Auth response includes RBAC fields when tenant is active:

```json
{
  "uid": "...",
  "email": "...",
  "permissions": ["loan.read", "loan.create"],
  "isSuperAdmin": false,
  "tenantId": "rates",
  "availableTenants": ["rates"]
}
```

After `POST /auth/select-tenant`, client must call `getIdToken(true)` to refresh the JWT.

### Entity catalog

| Method | Path            | Permission   |
| ------ | --------------- | ------------ |
| GET    | `/api/entities` | Any `*.read` |

Returns serialized entity definitions (static modules + tenant dynamic entities) with UI metadata and field access maps.

### CRUD (per entity)

Dynamic entities from Model Builder plus any compile-time module entities registered at bootstrap. Default bootstrap: `modules: []`.

| Method | Path                | Description                                |
| ------ | ------------------- | ------------------------------------------ |
| GET    | `/api/{entity}`     | List — `?limit=&cursor=` or `?query=` JSON |
| GET    | `/api/{entity}/:id` | Get one                                    |
| POST   | `/api/{entity}`     | Create                                     |
| PUT    | `/api/{entity}/:id` | Update                                     |
| DELETE | `/api/{entity}/:id` | Delete                                     |

### Entity relations (many-to-many)

| Method | Path                                     | Description                              |
| ------ | ---------------------------------------- | ---------------------------------------- |
| GET    | `/api/{entity}/:id/relations/:fieldName` | List linked target IDs                   |
| PUT    | `/api/{entity}/:id/relations/:fieldName` | Replace targets `{ "targetIds": [...] }` |

Query JSON example:

```http
GET /api/workItem?query={"filter":[{"field":"batchId","operator":"==","value":"batch_1"}],"pagination":{"limit":20}}
```

Response envelope:

```json
{ "data": ..., "error": null }
```

Errors:

```json
{
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} }
}
```

See [docs/crud-api.http](./docs/crud-api.http) for examples.

### Entity definitions (Model Builder)

| Method | Path                          | Permission                |
| ------ | ----------------------------- | ------------------------- |
| GET    | `/api/entity-definitions`     | `entityDefinition.read`   |
| POST   | `/api/entity-definitions`     | `entityDefinition.create` |
| PATCH  | `/api/entity-definitions/:id` | `entityDefinition.update` |

Superadmin may pass `?tenantId=` query param for cross-tenant operations.

### Hooks

| Method | Path             | Permission    |
| ------ | ---------------- | ------------- |
| GET    | `/api/hooks`     | `hook.read`   |
| POST   | `/api/hooks`     | `hook.create` |
| PATCH  | `/api/hooks/:id` | `hook.update` |

### Tenant roles

| Method | Path             | Permission    |
| ------ | ---------------- | ------------- |
| GET    | `/api/roles`     | `role.read`   |
| POST   | `/api/roles`     | `role.create` |
| PATCH  | `/api/roles/:id` | `role.update` |

### Module routes (optional)

When modules are registered in `app.config.ts`, custom routes mount under `/api/modules/{moduleName}/...`. Default bootstrap ships with no modules.

### Platform admin (superadmin)

| Method | Path                 | Description                                    |
| ------ | -------------------- | ---------------------------------------------- |
| GET    | `/admin/roles`       | Global role templates                          |
| GET    | `/admin/tenants`     | Tenant registry                                |
| POST   | `/admin/tenants`     | Create tenant                                  |
| PATCH  | `/admin/tenants/:id` | Update tenant                                  |
| GET    | `/admin/users`       | Paginated users                                |
| PATCH  | `/admin/users/:uid`  | Update `{ tenants: Record<string, string[]> }` |

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
await getAuth().setCustomUserClaims(uid, { tenantId: "rates" });
```

---

## Persistence

Collection path: `tenants/{tenantId}/{collection}/{documentId}`

| Entity               | Collection example                         |
| -------------------- | ------------------------------------------ |
| Dynamic `loan`       | `tenants/tenant_a/loans/{id}`              |
| `entity_definitions` | `tenants/tenant_a/entity_definitions/{id}` |

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
  "tenants": { "rates": ["admin"] }
}
```

Superadmin: `"platformRole": "superadmin"`.

See [packages/rbac/README.md](../../packages/rbac/README.md) and [docs/advanced-rbac-guide.md](../../docs/advanced-rbac-guide.md).

User access profiles cached 60s (`CACHE_TTL_MS`); invalidated on admin user PATCH.

---

## Performance and middleware

| Feature           | Config                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| Gzip              | `@fastify/compress` (global)                                                        |
| Rate limit        | `API_RATE_LIMIT_MAX`, `API_RATE_LIMIT_TIME_WINDOW_MS` (disabled in `NODE_ENV=test`) |
| Timing logs       | `ENABLE_PERF_LOGS` — logs `rbacMs`, `queryMs`, `hooksMs`, `totalMs`                 |
| Strict pagination | `STRICT_QUERY_PAGINATION` (default `true` in test)                                  |
| Cache TTL         | `CACHE_TTL_MS` (default 60000)                                                      |

See [docs/performance-scaling-guide.md](../../docs/performance-scaling-guide.md).

---

## Superadmin bootstrap

```
PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS=you@example.com

Cloud Run does not seed Firestore on startup. Seed once locally against the target GCP project with `pnpm seed:database` if needed.
```

Promotes email to superadmin on **first** user document creation. The **`rates`** tenant is **not** seeded on API startup — run **`pnpm seed:database`** after the API and emulators are up (see below).

### Database seed (manual)

Platform roles, the `rates` tenant (11 entities, 20 metrics, 35 queries), demo records, and metric backfill are applied only when you run:

```bash
pnpm seed:database
```

Requires Firestore (and Auth emulator for the demo user). With Docker dev, start the stack first (`pnpm dev:docker`), then seed from the repo root. The root script loads [`apps/api/.env.dev`](.env.dev) (emulator hosts and project id).

Re-run after `pnpm dev:docker:reset` or when refreshing catalog/demo data.

### Rates demo user (emulator / Docker)

| Field    | Value                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Email    | `testuser1@rates.com`                                                                                                                   |
| Password | `RatesTest1!` (see `RATES_TEST_USER_PASSWORD` in [`apps/api/src/admin/rates-tenant/constants.ts`](src/admin/rates-tenant/constants.ts)) |
| Tenant   | `rates` (set on JWT after `pnpm seed:database`)                                                                                         |
| Role     | `normalRatesUser` (pre-assigned on `users/{uid}`)                                                                                       |

Sign in through the web app with the Auth emulator enabled. No manual Firestore edits are required for this account.

To test a different user with the same role, assign manually:

```json
{ "tenants": { "rates": ["normalRatesUser"] } }
```

The **rates** tenant is emulator/Docker mock data only. Runtime Firestore composite index provisioning is skipped for that tenant (`indexProvisioningExcludedTenants`). After changing the entity model, reset emulator data with `pnpm dev:docker:reset`, then run `pnpm seed:database`.

---

## Production build (Cloud Run / Docker)

CI builds with [`esbuild.mjs`](esbuild.mjs): workspace packages are bundled into `dist/index.js`; packages in the `external` array stay as runtime `import`s.

**Rule:** every name in `external` must be a **direct** dependency in [`package.json`](package.json) (e.g. `firebase-admin`), or pnpm will not link it under `apps/api/node_modules` and Cloud Run will crash with `ERR_MODULE_NOT_FOUND`.

The [`Dockerfile`](Dockerfile) runs `pnpm --filter=api deploy --prod --legacy` to produce a flat prod layout (`dist/`, `package.json`, `node_modules/`).

---

## Project layout

```
src/
  auth/              JWT + App Check, tenant claim
  config/env.ts      Environment schema
  crud/              CRUD generator, response envelope
  entities/          Catalog, definitions, runtime context, relation routes
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
