# Entity System Guide

How the schema-driven entity layer fits into the monorepo and how future workstreams integrate with it.

**Workstream:** [ENTITY SYSTEM (CORE FOUNDATION)](<../Ecosystem%20Plan/v1/workstreams/ENTITY%20SYSTEM%20(CORE%20FOUNDATION).md>)

---

## Architecture

```mermaid
flowchart TB
  subgraph definition [Definition layer]
    Entities["@repo/entities\ndefineEntity()"]
    SharedTypes["@repo/shared-types/src/entities/\nCustomer, Order, ..."]
  end
  subgraph persistence [Persistence layer - WS3]
    FC["@repo/firestore-converters"]
    GCP["@repo/gcp-firebase"]
  end
  subgraph security [Security layer - WS4]
    RBAC["@repo/rbac"]
  end
  subgraph apps [Apps]
    API["apps/api\nCRUD generator - WS2"]
    Web["apps/web\nEntityTable/Form - WS5"]
  end
  SharedTypes --> Entities
  FC --> SharedTypes
  GCP --> FC
  API --> GCP
  API --> Entities
  API --> RBAC
  RBAC --> SharedTypes
  Web --> SharedTypes
  Web --> Entities
```

| Package / path                     | Role                                                              |
| ---------------------------------- | ----------------------------------------------------------------- |
| `@repo/entities`                   | Pure `defineEntity()` — Zod schemas, types, metadata, permissions |
| `@repo/shared-types/src/entities/` | Concrete business entity definitions                              |
| `@repo/firestore-converters`       | Versioned converters + `_schemaVersion` (User pattern)            |
| `@repo/gcp-firebase`               | Firestore repository implementations                              |
| `@repo/rbac`                       | Role definitions, permission resolution, wildcard matching        |
| `apps/api`                         | HTTP routes, tenant injection, RBAC enforcement                   |
| `apps/web`                         | Dynamic UI from entity metadata                                   |

Dependency direction: apps → gcp-firebase → firestore-converters → shared-types → entities. **Entities never import upward.**

---

## Core concepts

### Single source of truth

A developer defines fields once:

```ts
defineEntity({
  name: "customer",
  fields: {
    name: { type: "string", required: true },
    isActive: { type: "boolean", default: true },
  },
});
```

The system derives:

- Full, create, and update Zod schemas
- TypeScript types (`z.infer`)
- UI/API field metadata
- RBAC permission strings (`customer.read`, …)

### Multi-tenant readiness

Every full entity record includes `tenantId` (system field). Create schemas exclude it — the API middleware injects it from authenticated tenant context. Repositories must filter all reads/writes by `tenantId`.

### Dates

`type: "date"` uses **ISO datetime strings**, not native `Date` objects. Aligns with Firestore and the existing User model. See [@repo/entities README](../packages/entities/README.md#dates-are-iso-strings-not-date-objects).

---

## Workstream integration map

### WS2 — CRUD API (implemented)

Auto-generated routes in [`apps/api`](../apps/api/README.md):

- `GET/POST /api/{entity}`, `GET/PUT/DELETE /api/{entity}/:id`
- Auth: Bearer JWT + App Check + **`tenantId` custom claim**
- Response envelope: `{ data, error }`
- RBAC: per-route permission guards via `@repo/rbac` (WS4)

### WS4 — RBAC (implemented)

Permission resolution and enforcement:

- Package: [`@repo/rbac`](../packages/rbac/README.md) — roles, wildcards, `resolvePermissions`
- User roles on Firestore `users/{uid}`: `platformRole`, `tenants`
- API: per-action guards on CRUD routes (`customer.read`, `customer.create`, …)
- Web foundation: `/auth/validate` returns `permissions` + `isSuperAdmin`; `usePermission` hook

### WS5 — Frontend Entity UI (implemented)

Dynamic CRUD UI in [`apps/web/app/components/entity/`](../apps/web/app/components/entity/README.md):

- `EntityTable`, `EntityForm`, `EntityPage` driven by entity metadata from `@repo/shared-types`
- Routes: `/app/{entity}`, `/app/{entity}/new`, `/app/{entity}/:id`
- Client validation via shared Zod schemas; API via authenticated `api-client`
- RBAC: `useEntityPermissions` hides create/edit/delete actions

### WS6 — Frontend Routing (implemented)

Routing and navigation in [`apps/web/app/routing/`](../apps/web/app/routing/README.md):

- Centralized guards: auth, tenant, permission (`RouteGuards.tsx`)
- Parametric entity routes from entity catalog (`entity-routes.ts`)
- Tenant selection via `POST /auth/select-tenant` + `/select-tenant` page + sidebar switcher
- Permission-filtered sidebar (`useAccessibleNavItems`)

### WS7 — Basic Admin (implemented)

Platform role management in Firestore and a superadmin-only admin UI:

- Firestore `roles/{roleId}` collection with idempotent seed on API startup (`admin`, `editor`, `viewer`)
- Dynamic RBAC resolution: Firestore role catalog + built-in fallback in `@repo/rbac`
- Superadmin bootstrap via `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` on first user creation only
- Superadmin tenant visibility: all tenant IDs from Firestore `tenants` collection (+ optional `PLATFORM_KNOWN_TENANTS`)
- Admin API: `GET /admin/roles|tenants|users`, `PATCH /admin/users/:uid` (superadmin only)
- Web UI: `/settings/admin` for tenant role assignment

See [`apps/api/README.md`](../apps/api/README.md), [`apps/web/README.md`](../apps/web/README.md), and [`packages/rbac/README.md`](../packages/rbac/README.md).

### WS3 — Firestore DAL (implemented)

Persistence via [`createFirestoreAdminEntityRepository`](../packages/gcp-firebase/src/firestore-admin-entity-repository.ts):

- Path: `tenants/{tenantId}/{collection}/{documentId}` (collection from `metadata.collection`)
- Converters: `customerConverter`, `orderConverter` in `@repo/firestore-converters`
- Persisted schemas: `{ENTITY}_SCHEMA_VERSION` + `_schemaVersion` in `@repo/shared-types`
- API tests inject in-memory repos via `buildServer({ repositories })`; production uses Firestore

| Workstream            | Status  | Consumes from entity system                                              |
| --------------------- | ------- | ------------------------------------------------------------------------ |
| **2 — CRUD API**      | Done    | `createSchema`, `updateSchema`, `schema`, `permissions`                  |
| **3 — Firestore DAL** | Done    | `schema` + `_schemaVersion`; `metadata.collection`                       |
| **4 — RBAC**          | Done    | `metadata.permissions`; `@repo/rbac`; user `tenants` / `platformRole`    |
| **5 — Frontend UI**   | Done    | `metadata.fields`, shared Zod schemas, `/app/{entity}` CRUD UI           |
| **6 — Routing**       | Done    | Guards, tenant selection, permission-filtered nav from entity catalog    |
| **7 — Admin roles**   | Done    | Firestore `/roles`, admin API, `/settings/admin`, superadmin bootstrap |

### Future `defineApp`

```ts
// Planned — not implemented yet
defineApp({
  entities: [Customer, Order],
});
```

Use `registerEntity()` from `@repo/entities` today to prototype entity discovery. See entity registry notes in the package README.

---

## Adding a new business entity

1. Add `packages/shared-types/src/entities/{entity}.ts` — [template](../packages/shared-types/src/entities/README.md#file-template)
2. Export from `packages/shared-types/src/index.ts`
3. Follow [Firestore collections guide](./firestore-collections-guide.md) for converter + repository (WS3)
4. Register CRUD routes in [`apps/api/src/server.ts`](../apps/api/src/server.ts) — see [CRUD README](../apps/api/src/crud/README.md)
5. Add dynamic UI routes in `apps/web`

---

## Extension points (Phase 2+)

Designed but **not implemented** in Workstream 1:

| Feature                  | Extension mechanism                              |
| ------------------------ | ------------------------------------------------ |
| Relations / foreign keys | New field type + `FieldTypeRegistry` handler     |
| Custom field types       | Same registry pattern                            |
| Field-level permissions  | Extend `NormalizedFieldMeta`                     |
| Dynamic UI config        | `EntityMetadata.ui` optional bag                 |
| Enums                    | New field type or `string` + metadata constraint |
| Query/filter engine      | New package consuming `metadata.fields`          |

Keep extensions in the field registry and metadata types — avoid changing `defineEntity` core logic for each new feature.

---

## Related docs

- [@repo/entities package README](../packages/entities/README.md) — entity definition API
- [API app README](../apps/api/README.md) — CRUD routes, auth, tenant claims
- [CRUD generator](../apps/api/src/crud/README.md) — design and extension points
- [Business entities folder](../packages/shared-types/src/entities/README.md) — per-entity file template
- [Firestore collections guide](./firestore-collections-guide.md) — persistence wiring
- [General Definitions — Phase 1](../Ecosystem%20Plan/v1/General%20Definitions.md) — full platform scope
