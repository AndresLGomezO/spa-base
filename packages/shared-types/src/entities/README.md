# Business entities

Tenant-scoped business models defined with `defineEntity()` from `@repo/entities`. Each file exports one entity plus its schemas, types, collection constant, permissions, and optional `ui` metadata for the Advanced UI Builder.

See: [@repo/entities README](../../../entities/README.md) · [Entity System Guide](../../../../docs/entity-system-guide.md) · [Advanced UI Builder Guide](../../../../docs/advanced-ui-builder-guide.md)

---

## Adding a new static entity (optional module path)

For tenant-defined models, use **Model Builder** — [dynamic-entity-builder-guide.md](../../../../docs/dynamic-entity-builder-guide.md).

For compile-time entities:

1. Create entity in `modules/{name}/src/entities/{entity}.ts` (or legacy `shared-types` path).
2. Register via module in `apps/platform/app.config.ts`.
3. Wire Firestore converter — [firestore-collections-guide.md](../../../../docs/firestore-collections-guide.md).
4. Add composite indexes for FK fields if needed.

### Relation field example

```ts
batchId: {
  type: "relation",
  relation: { target: "batch", type: "many-to-one", onDelete: "restrict" },
},
```

### File template

```ts
import { defineEntity } from "@repo/entities";
import type { z } from "zod";

export const Product = defineEntity({
  name: "product",
  fields: {
    sku: { type: "string", required: true },
    price: { type: "number", required: true },
    inStock: { type: "boolean", default: true },
  },
  ui: {
    nav: { label: "Products" },
    views: [
      { type: "table", name: "default", fields: ["sku", "price", "inStock"] },
    ],
    forms: {
      create: { sections: [{ fields: ["sku", "price"] }] },
      edit: { sections: [{ fields: ["sku", "price", "inStock"] }] },
    },
  },
});

export const PRODUCTS_COLLECTION = Product.metadata.collection;

export const productSchema = Product.schema;
export const productCreateSchema = Product.createSchema;
export const productUpdateSchema = Product.updateSchema;

export const PRODUCT_PERMISSIONS = Product.metadata.permissions;

export type ProductRecord = z.infer<typeof productSchema>;
export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
```

### Naming conventions

| Export              | Example              |
| ------------------- | -------------------- |
| Entity instance     | `Batch`              |
| Collection constant | `BATCHES_COLLECTION` |
| Domain schema       | `batchSchema`        |
| Create schema       | `batchCreateSchema`  |
| Update schema       | `batchUpdateSchema`  |
| Permissions tuple   | `BATCH_PERMISSIONS`  |
| Record type         | `BatchRecord`        |
| Create type         | `BatchCreate`        |
| Update type         | `BatchUpdate`        |

For Firestore persisted schemas and converters, add in the entity file:

```ts
export const BATCH_SCHEMA_VERSION = 1 as const;

const batchSchemaObject = batchSchema as unknown as z.ZodObject<
  Record<string, z.ZodTypeAny>
>;

export const persistedBatchSchemaV1 = batchSchemaObject
  .extend({ _schemaVersion: z.literal(BATCH_SCHEMA_VERSION) })
  .strict();
export type PersistedBatch = z.infer<typeof persistedBatchSchemaV1>;
```

Dynamic entities skip hand-written files here — converters are created at runtime via `createEntityConverter()`.

---

## Static vs dynamic

| Path        | Where defined                         | When to use                           |
| ----------- | ------------------------------------- | ------------------------------------- |
| **Dynamic** | Model Builder → `entity_definitions`  | Default tenant experience             |
| **Static**  | Module entity file + `defineModule()` | Compile-time entities, custom modules |

The web app loads definitions from `GET /api/entities`; it does not import entity modules directly.

---

## Integration checklist (per entity)

When wiring a full vertical slice:

- [ ] Entity defined here with `defineEntity` (+ optional `ui`)
- [ ] Exported from `src/index.ts`
- [ ] Registered in `register-entities.ts`
- [ ] `{ENTITY}_SCHEMA_VERSION` + persisted schema in `@repo/firestore-converters`
- [ ] Converter registered in API entity converter registry
- [ ] RBAC checks using `{ENTITY}_PERMISSIONS`
- [ ] UI appears via `GET /api/entities` (no web hardcoding)

---

## Do not migrate here (yet)

**`RegisteredUser`** (`src/user/registered-user.ts`) stays hand-written — it is auth-global, not tenant-scoped, and already has a working converter stack. Do not force it through `defineEntity` unless product requirements change.
