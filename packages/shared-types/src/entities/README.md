# Business entities

Tenant-scoped business models defined with `defineEntity()` from `@repo/entities`. Each file exports one entity plus its schemas, types, collection constant, and permissions for downstream packages.

See: [@repo/entities README](../../../entities/README.md) · [Entity System Guide](../../../../docs/entity-system-guide.md)

---

## Adding a new entity

1. Create `src/entities/{entity}.ts` following the template below.
2. Re-export from `src/index.ts` (entity, schemas, types, collection, permissions).
3. Wire persistence in Workstream 3 (`@repo/firestore-converters`, `@repo/gcp-firebase`) using [Firestore collections guide](../../../../docs/firestore-collections-guide.md).
4. Register the entity in `src/register-entities.ts` for relation validation.
5. For relation fields, add Firestore composite indexes — see [Relational Data System Guide](../../../../docs/relational-data-system-guide.md).

### Relation field example

```ts
customerId: {
  type: "relation",
  required: true,
  relation: { target: "customer", type: "many-to-one", onDelete: "restrict" },
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

| Export              | Example                |
| ------------------- | ---------------------- |
| Entity instance     | `Customer`             |
| Collection constant | `CUSTOMERS_COLLECTION` |
| Domain schema       | `customerSchema`       |
| Create schema       | `customerCreateSchema` |
| Update schema       | `customerUpdateSchema` |
| Permissions tuple   | `CUSTOMER_PERMISSIONS` |
| Record type         | `CustomerRecord`       |
| Create type         | `CustomerCreate`       |
| Update type         | `CustomerUpdate`       |

For Firestore persisted schemas and converters, add in the entity file:

```ts
export const CUSTOMER_SCHEMA_VERSION = 1 as const;

const customerSchemaObject = customerSchema as unknown as z.ZodObject<
  Record<string, z.ZodTypeAny>
>;

export const persistedCustomerSchemaV1 = customerSchemaObject
  .extend({ _schemaVersion: z.literal(CUSTOMER_SCHEMA_VERSION) })
  .strict();
export type PersistedCustomer = z.infer<typeof persistedCustomerSchemaV1>;
```

See `customer.ts` and `order.ts` for the live pattern. Converters live in `@repo/firestore-converters/src/{entity}/`.

---

## Current entities

| Entity   | Collection  | File          |
| -------- | ----------- | ------------- |
| Customer | `customers` | `customer.ts` |
| Order    | `orders`    | `order.ts` — includes `customerId` → `customer` |

---

## Integration checklist (per entity)

When wiring a full vertical slice:

- [ ] Entity defined here with `defineEntity`
- [ ] Exported from `src/index.ts`
- [ ] `{ENTITY}_SCHEMA_VERSION` + persisted schema in `@repo/firestore-converters`
- [ ] Repository interface + Admin SDK implementation in `@repo/gcp-firebase`
- [ ] CRUD routes in `apps/api` using `createSchema` / `updateSchema`
- [ ] RBAC checks using `{ENTITY}_PERMISSIONS`
- [ ] UI table/form using `metadata.fields` + shared schemas

---

## Do not migrate here (yet)

**`RegisteredUser`** (`src/user/registered-user.ts`) stays hand-written — it is auth-global, not tenant-scoped, and already has a working converter stack. Do not force it through `defineEntity` unless product requirements change.
