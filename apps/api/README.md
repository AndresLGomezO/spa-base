# API (`apps/api`)

Fastify HTTP API for the platform. Handles auth validation and auto-generated CRUD routes for tenant-scoped business entities.

## Routes

### Auth (legacy envelope)

| Method | Path             | Auth               |
| ------ | ---------------- | ------------------ |
| GET    | `/auth/validate` | Bearer + App Check |

Response shape: `{ ok, user, appCheck }` or `{ ok: false, code, message }` — unchanged for web app compatibility.

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

## Persistence (WS2)

CRUD routes use **in-memory repositories** (`src/repositories/in-memory-entity-repository.ts`). Data is lost on server restart.

**Workstream 3** will swap in Firestore implementations via the same `TenantScopedEntityRepository` port — see [`packages/firestore-converters/src/entity/README.md`](../../packages/firestore-converters/src/entity/README.md).

## Project layout

```
src/
  auth/              JWT + App Check preHandler, tenant claim extraction
  crud/              registerCrudRoutes, response envelope, validation
  repositories/      In-memory entity repository (WS2)
  routes/            Auth validate route
  server.ts          Fastify bootstrap
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
