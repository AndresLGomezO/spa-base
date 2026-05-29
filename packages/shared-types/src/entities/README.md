# Business entities

Tenant-scoped business models defined with `defineEntity()` from `@repo/entities`. Each file exports one entity plus its schemas, types, collection constant, permissions, and optional `ui` metadata for the Advanced UI Builder.

See: [@repo/entities README](../../../entities/README.md) · [Entity System Guide](../../../../docs/entity-system-guide.md) · [Advanced UI Builder Guide](../../../../docs/advanced-ui-builder-guide.md)

---

## Adding a new entity

1. Create `src/entities/{entity}.ts` following the template below.
2. Re-export from `src/index.ts` (entity, schemas, types, collection, permissions).
3. Wire persistence in Workstream 3 (`@repo/firestore-converters`, `@repo/gcp-firebase`) using [Firestore collections guide](../../../../docs/firestore-collections-guide.md).
4. Register the entity in `src/register-entities.ts` for relation validation and generic API wiring.
5. For relation fields, add Firestore composite indexes — see [Relational Data System Guide](../../../../docs/relational-data-system-guide.md).
6. Add optional `ui` block for list/form/nav metadata (see Advanced UI Builder Guide).

### Relation field example

```ts
organizationId: {
  type: "relation",
  required: true,
  relation: { target: "organization", type: "many-to-one", onDelete: "restrict" },
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

| Export              | Example                    |
| ------------------- | -------------------------- |
| Entity instance     | `Organization`             |
| Collection constant | `ORGANIZATIONS_COLLECTION` |
| Domain schema       | `organizationSchema`       |
| Create schema       | `organizationCreateSchema` |
| Update schema       | `organizationUpdateSchema` |
| Permissions tuple   | `ORGANIZATION_PERMISSIONS` |
| Record type         | `OrganizationRecord`       |
| Create type         | `OrganizationCreate`       |
| Update type         | `OrganizationUpdate`       |

For Firestore persisted schemas and converters, add in the entity file:

```ts
export const ORGANIZATION_SCHEMA_VERSION = 1 as const;

const organizationSchemaObject = organizationSchema as unknown as z.ZodObject<
  Record<string, z.ZodTypeAny>
>;

export const persistedOrganizationSchemaV1 = organizationSchemaObject
  .extend({ _schemaVersion: z.literal(ORGANIZATION_SCHEMA_VERSION) })
  .strict();
export type PersistedOrganization = z.infer<
  typeof persistedOrganizationSchemaV1
>;
```

See `organization.ts` and `project.ts` for the live pattern. Converters live in `@repo/firestore-converters/src/{entity}/`.

---

## Current seed entities

| Entity       | Collection      | File                                             |
| ------------ | --------------- | ------------------------------------------------ |
| Organization | `organizations` | `organization.ts`                                |
| Project      | `projects`      | `project.ts` — `organizationId` → `organization` |

These are **dev/test fixtures**, not product domain. The web app loads definitions from `GET /api/entities`; it does not import these modules.

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
