# @repo/entities

Pure **entity definition layer** for the platform. Declares business data models once and derives Zod schemas, TypeScript types, metadata, and RBAC permission strings.

This package has **no dependencies on Firestore, Fastify, or React**. Downstream workstreams (CRUD API, DAL, RBAC, dynamic UI) consume its outputs without this package knowing about them.

See also: [Entity System Guide](../../docs/entity-system-guide.md) · [Business entities in shared-types](../shared-types/src/entities/README.md) · [Firestore collections guide](../../docs/firestore-collections-guide.md)

---

## Quick start

```ts
import { defineEntity } from "@repo/entities";

export const Customer = defineEntity({
  name: "customer",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    isActive: { type: "boolean", default: true },
  },
});

// Validate create input (shared by API + UI)
Customer.createSchema.safeParse({ name: "Acme" });

// Metadata for CRUD, UI, RBAC
Customer.metadata.collection; // "customers"
Customer.metadata.permissions; // ["customer.read", "customer.create", ...]
```

Concrete business entities (`Customer`, `Order`, …) live in `@repo/shared-types/src/entities/` and are re-exported from `@repo/shared-types` for apps.

---

## Package layout

```
src/
  defineEntity.ts          Public entrypoint — assembles schemas + metadata
  types.ts                 Field configs, inferred types, EntityMetadata
  systemFields.ts          Auto-injected id, tenantId, createdAt, updatedAt
  fieldTypes.ts            FieldSchemaBuilder + FieldTypeRegistry interfaces
  schema/
    isoDatetime.ts         ISO datetime string validator (Firestore-aligned)
    buildFieldSchema.ts    Phase-1 field builders + defaultFieldTypeRegistry
    buildEntitySchemas.ts  Builds full / create / update Zod schemas
  metadata/
    buildMetadata.ts       Normalized field metadata for UI/API
    buildPermissions.ts    CRUD permission tuple + collection naming
  registry/
    entityRegistry.ts      registerEntity / getEntity (future defineApp)
```

---

## Design

### Three schemas per entity (Interface Segregation)

| Schema         | Contains                    | Used by                            |
| -------------- | --------------------------- | ---------------------------------- |
| `schema`       | User fields + system fields | Reads, post-persistence validation |
| `createSchema` | User fields only            | POST bodies                        |
| `updateSchema` | Partial user fields         | PUT/PATCH bodies                   |

System fields (`id`, `tenantId`, `createdAt`, `updatedAt`) are **never** in create/update schemas. Clients cannot set them; the API layer injects them on write.

### System fields

| Field       | Type                | Create                              | Update              |
| ----------- | ------------------- | ----------------------------------- | ------------------- |
| `id`        | trimmed string      | Server-generated                    | Immutable           |
| `tenantId`  | trimmed string      | Server-injected from tenant context | Immutable           |
| `createdAt` | ISO datetime string | Server-set on create                | Immutable           |
| `updatedAt` | ISO datetime string | Server-set on write                 | Server-set on write |

Developers must **not** define these in `fields`. TypeScript rejects configs that include system field keys (`AssertNoSystemFields`).

### Phase-1 field types

| `type`    | TS value                | Zod                                           |
| --------- | ----------------------- | --------------------------------------------- |
| `string`  | `string`                | `z.string().trim()` (+ `.min(1)` if required) |
| `number`  | `number`                | `z.number()`                                  |
| `boolean` | `boolean`               | `z.boolean()`                                 |
| `date`    | ISO datetime **string** | `isoDatetimeStringSchema`                     |

**Date convention:** `type: "date"` stores ISO strings, not `Date` objects. This matches the User model and Firestore serialization. See [workaround](#dates-are-iso-strings-not-date-objects) below.

### Field semantics

- `required: true` — must be present on create (unless `default` is set).
- `default` — applied by Zod when the field is omitted on create; field becomes optional in create input.
- No `required` and no `default` — optional everywhere.

### Permissions

Auto-generated from `name`:

```
{name}.read | {name}.create | {name}.update | {name}.delete
```

Exposed on `entity.metadata.permissions` as a typed `as const` tuple for RBAC (Workstream 4).

### Entity registry

`registerEntity(entity)` / `getEntity(name)` / `getAllEntities()` hold defined entities for a future `defineApp({ entities: [...] })`. Registry values are intentionally widened to `AnyDefinedEntity` — see [registry workaround](#entity-registry-type-widening).

---

## Integration guide (next workstreams)

### Workstream 2 — CRUD API generator

```ts
// POST /api/{collection}
const parsed = entity.createSchema.safeParse(request.body);
// Inject: id, tenantId, createdAt, updatedAt before persistence

// PUT /api/{collection}/:id
const parsed = entity.updateSchema.safeParse(request.body);

// GET response validation (optional)
entity.schema.parse(recordFromDb);

// Route permission checks
entity.metadata.permissions; // pass to RBAC middleware
```

Use `entity.metadata.collection` for Firestore collection name and URL segment.

### Workstream 3 — Firestore DAL

Extend the full domain schema with `_schemaVersion` in `@repo/firestore-converters` (same pattern as User):

```ts
import { customerSchema } from "@repo/shared-types";

export const persistedCustomerSchemaV1 = customerSchema.extend({
  _schemaVersion: z.literal(CUSTOMER_SCHEMA_VERSION),
});
```

All tenant-scoped queries must filter by `tenantId`. The entity system declares the field; enforcement belongs in repository/API middleware.

### Workstream 4 — RBAC

Register permissions from each entity:

```ts
for (const entity of getAllEntities()) {
  registerPermissions(entity.metadata.permissions);
}
```

### Workstream 5 — Dynamic UI

Read generic metadata (no React in this package):

```ts
Object.entries(entity.metadata.fields).map(([name, meta]) => ({
  name,
  type: meta.type,
  required: meta.required,
  default: meta.default,
}));
```

Use the same `createSchema` / `updateSchema` in forms for client-side validation.

---

## Extending the system

### Adding a new field type (Open/Closed)

1. Add a config interface in `types.ts` (e.g. `RelationFieldConfig`).
2. Extend `FieldConfig` union and `Phase1FieldType`.
3. Implement `FieldSchemaBuilder` in a new handler.
4. Register in `defaultFieldTypeRegistry` (or pass a custom registry to `buildEntitySchemas` internally via a future `defineEntity` option).

Do **not** add relation/UI/workflow logic inside `defineEntity` — keep handlers focused on Zod shape + metadata.

### Adding UI metadata (Phase 2)

Use the optional `EntityMetadata.ui` bag or extend `NormalizedFieldMeta` with new optional properties. Keep them generic (no component names).

### Custom collection names

```ts
defineEntity({
  name: "invoice",
  collection: "billing_invoices", // override default pluralization
  fields: {
    /* ... */
  },
});
```

Default pluralization: append `s`, or `es` when name ends in `s` (`status` → `statuses`).

---

## Recommendations

1. **Define business entities in `@repo/shared-types/src/entities/`** — apps import from `@repo/shared-types`, not `@repo/entities` directly.
2. **Keep `RegisteredUser` separate** — auth-global, not tenant-scoped; uses the hand-written User stack until a deliberate migration.
3. **Validate with the correct schema** — `createSchema` for POST, `updateSchema` for PATCH, full `schema` after merging system fields.
4. **Inject `tenantId` in API middleware** — never trust client-supplied tenant IDs.
5. **Use `z.infer<typeof entity.schema>`** in shared-types for exported record types — avoids duplicating inferred shapes.

---

## Workarounds and known constraints

### Dates are ISO strings, not Date objects

The workstream spec shows `Date` in examples; this platform uses ISO datetime strings for Firestore compatibility (same as `registeredUserSchemaV1`). UI can parse with `new Date(value)` when needed.

### Entity registry type widening

`registerEntity` stores entities as `AnyDefinedEntity` because TypeScript cannot preserve per-entity generic field maps in a heterogeneous `Map`. Consumers that need precise types should import the concrete entity (`Customer`) rather than `getEntity("customer")`.

### Optional fields on full schema vs create schema

Optional user fields (no `required`, no `default`) are `.optional()` on the **full** schema too — persisted documents may omit them. Required fields with defaults are required on the full schema but optional on create (default fills in).

### Zod strict mode

All schemas use `.strict()` — unknown keys are rejected. API layers should strip or reject extra properties before validation.

### `InferEntity` vs `z.infer`

Both work. `InferEntity<TFields>` is for library internals; exported types in shared-types use `z.infer<typeof schema>` for simplicity and guaranteed alignment with runtime validation.

### Schema version constant

Entity definitions do not include `_schemaVersion`. Add `{ENTITY}_SCHEMA_VERSION = 1` in shared-types when wiring Firestore converters (Workstream 3).

---

## Testing

```bash
pnpm --filter @repo/entities test
pnpm --filter @repo/entities validate
```

Tests live in `src/defineEntity.test.ts` — schema generation, validation, defaults, permissions, registry, and mock downstream consumers.

---

## What not to put here

- Firestore converters or repositories
- Fastify routes or middleware
- React components or UI-specific metadata
- Business logic (workflows, calculations)
- Relation/join query logic (Phase 2+)
