# @repo/entities

Pure **entity definition layer** for the platform. Declares business data models once and derives Zod schemas, TypeScript types, metadata, and RBAC permission strings.

This package has **no dependencies on Firestore, Fastify, or React**. Downstream layers (CRUD API, DAL, RBAC, dynamic UI) consume its outputs without this package knowing about them.

See also: [Entity System Guide](../../docs/entity-system-guide.md) · [master-plans.md](../../docs/master-plans.md)

---

## Quick start

```ts
import { defineEntity } from "@repo/entities";

export const Loan = defineEntity({
  name: "loan",
  fields: {
    amount: { type: "number", required: true },
    status: { type: "string" },
  },
});

Loan.createSchema.safeParse({ amount: 1000 });

Loan.metadata.collection; // "loans"
Loan.metadata.permissions; // ["loan.read", "loan.create", ...]
```

**Static entities** are defined in optional compile-time modules (`defineModule()`). **Dynamic entities** are created per tenant via Model Builder — see [Dynamic Entity Builder Guide](../../docs/dynamic-entity-builder-guide.md). Default bootstrap uses `modules: []` in `apps/platform/app.config.ts`.

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
    entityRegistry.ts      registerEntity / getAllEntities (populated by loadApp)
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

| `type`     | TS value                | Zod                                           |
| ---------- | ----------------------- | --------------------------------------------- |
| `string`   | `string`                | `z.string().trim()` (+ `.min(1)` if required) |
| `number`   | `number`                | `z.number()`                                  |
| `boolean`  | `boolean`               | `z.boolean()`                                 |
| `date`     | ISO datetime **string** | `isoDatetimeStringSchema`                     |
| `relation` | `string` (FK id)        | `z.string().trim().min(1)` for FK relations   |

Scalar fields (`string`, `number`, `boolean`, `date`, `enum`) and file fields (`image`, `document`) may set `isArray: true` to store `T[]` (for example tags or multiple attachments). Relation fields cannot be arrays. Array fields use Firestore `array-contains` for filters; `string[]` and `enum[]` support normalized token search mirrors.

See [Relational Data System Guide](../../docs/relational-data-system-guide.md) for relation config (`target`, `type`, `onDelete`, join collections).

**Date convention:** `type: "date"` stores ISO strings, not `Date` objects. This matches the User model and Firestore serialization. See [workaround](#dates-are-iso-strings-not-date-objects) below.

### Field semantics

- `required: true` — must be present on create (unless `default` is set).
- `default` — applied by Zod when the field is omitted on create; field becomes optional in create input.
- No `required` and no `default` — optional everywhere.
- `isArray: true` — stores multiple values as a JSON array; required arrays need at least one element.

### Permissions

Auto-generated from `name`:

```
{name}.read | {name}.create | {name}.update | {name}.delete
```

Exposed on `entity.metadata.permissions` as a typed `as const` tuple for RBAC.

### Entity registry

`registerEntity(entity)` / `getEntity(name)` / `getAllEntities()` hold defined entities. Modules register entities via `loadApp()` from `@repo/modules` at platform bootstrap — see [Module Extension Guide](../../docs/module-extension-guide.md). Registry values are intentionally widened to `AnyDefinedEntity` — see [registry workaround](#entity-registry-type-widening).

---

## Integration (delivered)

CRUD, Firestore DAL, RBAC, Query Engine, relations, and dynamic UI all consume this package today. See [entity-system-guide.md](../../docs/entity-system-guide.md) and [master-plans.md](../../docs/master-plans.md).

```ts
// POST — validate with createSchema; inject system fields before persist
entity.createSchema.safeParse(request.body);

// PUT — partial update
entity.updateSchema.safeParse(request.body);

// Route permission checks
entity.metadata.permissions;
```

Persisted records add `_schemaVersion` in `@repo/firestore-converters` (see [firestore-collections-guide.md](../../docs/firestore-collections-guide.md)).

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

1. **Optional static entities** — define in a module and register via `defineModule()` in `@app/platform/app.config.ts` when compile-time entities are needed.
2. **Keep `RegisteredUser` separate** — auth-global, not tenant-scoped; uses the hand-written User stack until a deliberate migration.
3. **Validate with the correct schema** — `createSchema` for POST, `updateSchema` for PATCH, full `schema` after merging system fields.
4. **Inject `tenantId` in API middleware** — never trust client-supplied tenant IDs.
5. **Use `z.infer<typeof entity.schema>`** in shared-types for exported record types — avoids duplicating inferred shapes.

---

## Workarounds and known constraints

### Dates are ISO strings, not Date objects

The workstream spec shows `Date` in examples; this platform uses ISO datetime strings for Firestore compatibility (same as `registeredUserSchemaV1`). UI can parse with `new Date(value)` when needed.

### Entity registry type widening

`registerEntity` stores entities as `AnyDefinedEntity` because TypeScript cannot preserve per-entity generic field maps in a heterogeneous `Map`. Consumers that need precise types should import the concrete entity (`Loan`) rather than `getEntity("loan")`.

### Optional fields on full schema vs create schema

Optional user fields (no `required`, no `default`) are `.optional()` on the **full** schema too — persisted documents may omit them. Required fields with defaults are required on the full schema but optional on create (default fills in).

### Zod strict mode

All schemas use `.strict()` — unknown keys are rejected. API layers should strip or reject extra properties before validation.

### `InferEntity` vs `z.infer`

Both work. `InferEntity<TFields>` is for library internals; exported types in shared-types use `z.infer<typeof schema>` for simplicity and guaranteed alignment with runtime validation.

### Schema version constant

Entity definitions do not include `_schemaVersion`. Add version constants in converters when wiring Firestore persistence.

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
