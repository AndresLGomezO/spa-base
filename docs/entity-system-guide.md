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
  subgraph apps [Apps]
    API["apps/api\nCRUD generator - WS2"]
    Web["apps/web\nEntityTable/Form - WS5"]
  end
  SharedTypes --> Entities
  FC --> SharedTypes
  GCP --> FC
  API --> GCP
  API --> Entities
  Web --> SharedTypes
  Web --> Entities
```

| Package / path                     | Role                                                              |
| ---------------------------------- | ----------------------------------------------------------------- |
| `@repo/entities`                   | Pure `defineEntity()` — Zod schemas, types, metadata, permissions |
| `@repo/shared-types/src/entities/` | Concrete business entity definitions                              |
| `@repo/firestore-converters`       | Versioned converters + `_schemaVersion` (User pattern)            |
| `@repo/gcp-firebase`               | Firestore repository implementations                              |
| `apps/api`                         | HTTP routes, tenant injection, RBAC                               |
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

| Workstream            | Consumes from entity system                                                    |
| --------------------- | ------------------------------------------------------------------------------ |
| **2 — CRUD API**      | `metadata.collection`, `createSchema`, `updateSchema`, `schema`, `permissions` |
| **3 — Firestore DAL** | `schema` extended with `_schemaVersion`; `metadata.collection`                 |
| **4 — RBAC**          | `metadata.permissions` per entity                                              |
| **5 — Frontend UI**   | `metadata.fields`, shared Zod schemas                                          |
| **6 — Routing**       | Entity list from registry or shared-types exports                              |
| **7 — Admin roles**   | Permission strings registered from entities                                    |

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
3. Follow [Firestore collections guide](./firestore-collections-guide.md) for converter + repository
4. Register CRUD routes and RBAC in `apps/api`
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

- [@repo/entities package README](../packages/entities/README.md) — API, workarounds, testing
- [Business entities folder](../packages/shared-types/src/entities/README.md) — per-entity file template
- [Firestore collections guide](./firestore-collections-guide.md) — persistence wiring
- [General Definitions — Phase 1](../Ecosystem%20Plan/v1/General%20Definitions.md) — full platform scope
