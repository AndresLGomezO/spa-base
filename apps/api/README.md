# API (`apps/api`)

Fastify HTTP API for the platform. Handles auth validation and auto-generated CRUD routes for tenant-scoped business entities.

## Routes

### Auth (legacy envelope)

| Method | Path                  | Auth               |
| ------ | --------------------- | ------------------ |
| GET    | `/auth/validate`      | Bearer + App Check |
| POST   | `/auth/select-tenant` | Bearer + App Check |

Response shape: `{ ok, user, appCheck }` or `{ ok: false, code, message }`.

The `user` object includes resolved RBAC fields for the active tenant (when `tenantId` is present on the ID token):

```json
{
  "uid": "...",
  "email": "...",
  "permissions": ["customer.read", "order.read"],
  "isSuperAdmin": false,
  "tenantId": "tenant_dev_1",
  "availableTenants": ["tenant_dev_1", "tenant_dev_2"]
}
```

When `tenantId` is missing from the JWT, `permissions` is empty and `tenantId` is `null`. The web app redirects to tenant selection.

### `POST /auth/select-tenant`

Request body:

```json
{ "tenantId": "tenant_dev_1" }
```

Verifies the user has the tenant in Firestore `users/{uid}.tenants`, sets the Firebase custom claim, and returns:

```json
{
  "ok": true,
  "tenantId": "tenant_dev_1",
  "availableTenants": ["tenant_dev_1", "tenant_dev_2"],
  "permissions": ["..."],
  "isSuperAdmin": false
}
```

The client must call `getIdToken(true)` after a successful response to pick up the new claim.

### CRUD (standard envelope)

For each entity defined in `@repo/shared-types` (currently `customer`, `order`):

| Method | Path                | Description                     |
| ------ | ------------------- | ------------------------------- |
| GET    | `/api/{entity}`     | List (query: `limit`, `cursor`) |
| GET    | `/api/{entity}/:id` | Get one                         |
| POST   | `/api/{entity}`     | Create                          |
| PUT    | `/api/{entity}/:id` | Partial update                  |
| DELETE | `/api/{entity}/:id` | Hard delete                     |

Response shape:

```json
{ "data": ..., "error": null }
```

Error shape:

```json
{
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} }
}
```

See [`docs/crud-api.http`](./docs/crud-api.http) for example requests.

## Authentication

All CRUD routes require:

```
Authorization: Bearer <Firebase ID token>
X-Firebase-AppCheck: <App Check token>
```

### Tenant isolation

CRUD routes require a **`tenantId` custom claim** on the Firebase ID token. The API injects this value on writes and filters all reads by it. Clients must never send `tenantId` in the body.

#### Setting `tenantId` in development

Use Firebase Admin SDK (or emulator tooling) to set a custom claim before CRUD will work:

```js
import { getAuth } from "firebase-admin/auth";

await getAuth().setCustomUserClaims(uid, { tenantId: "tenant_dev_1" });
```

Users must refresh their ID token after claims change (sign out/in or `getIdToken(true)` on the client).

## Persistence (WS3 — Firestore)

CRUD routes persist to Firestore via `createFirestoreAdminEntityRepository` in `@repo/gcp-firebase`.

**Collection path:** `tenants/{tenantId}/{collection}/{documentId}`

| Entity   | Path example                              |
| -------- | ----------------------------------------- |
| Customer | `tenants/tenant_a/customers/{docId}`      |
| Order    | `tenants/tenant_a/orders/{docId}`         |

### Local development

Start the Firestore emulator before using CRUD routes locally:

```bash
pnpm emulators          # from repo root
pnpm --filter api dev
```

Ensure `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` is set (see `apps/api/.env.dev.example`).

Integration tests in `@repo/gcp-firebase` require the emulator (`FIRESTORE_EMULATOR_HOST`). API route tests use in-memory repositories via `buildServer({ repositories })` and mock access profiles via `buildServer({ getUserAccessProfile })`.

## RBAC (WS4)

CRUD routes enforce permissions via `@repo/rbac`. Users without roles for the active tenant receive **403 FORBIDDEN**.

### Seeding roles in development

Set tenant roles on the Firestore user document (`users/{uid}`). Auth upsert preserves existing `platformRole` and `tenants` fields on login.

```json
{
  "platformRole": null,
  "tenants": {
    "tenant_dev_1": ["admin"]
  }
}
```

Built-in roles: `admin`, `editor`, `viewer`. Platform superadmin: `"platformRole": "superadmin"`.

Example with Admin SDK:

```js
import { getFirestore } from "firebase-admin/firestore";

await getFirestore()
  .collection("users")
  .doc(uid)
  .set(
    {
      tenants: { tenant_dev_1: ["admin"] },
    },
    { merge: true },
  );
```

See [`packages/rbac/README.md`](../../packages/rbac/README.md) for wildcard and permission details.

## Project layout

```
src/
  auth/              JWT + App Check preHandler, tenant claim extraction
  crud/              registerCrudRoutes, response envelope, validation
  rbac/              Permission loading, requirePermission, entity guards
  repositories/      In-memory entity repository (tests / reference)
  routes/            Auth validate route
  server.ts          Fastify bootstrap + Firestore repo wiring
```

## Commands

```bash
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api typecheck
```

## Related docs

- [CRUD generator design](./src/crud/README.md)
- [Entity system guide](../../docs/entity-system-guide.md)
- [Repository port](../../packages/firestore-converters/src/entity/README.md)
