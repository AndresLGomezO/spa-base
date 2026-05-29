# Advanced UI Builder Guide

Registry-driven entity UI for the web app. Entity definitions (including optional `ui` metadata) are served by `GET /api/entities`; the web app never imports business models from `@repo/shared-types`.

**Workstream:** [10.2 ADVANCED UI BUILDER](<../Ecosystem%20Plan/v2/Key%20Capabilitues/10.2%20ADVANCED%20UI%20BUILDER.md>)

---

## Architecture

```mermaid
flowchart LR
  Modules["modules/core + extensions\ndefineModule()"]
  Bootstrap["bootstrapPlatformApp()"]
  API["GET /api/entities\n+ UI extension merge"]
  Catalog["EntityCatalogProvider\nuseEntityCatalog()"]
  Builder["@repo/ui-builder\nViewEngine / FormEngine"]
  Web["EntityTable / EntityForm\nfield + view registries"]

  Modules --> Bootstrap
  Bootstrap --> API
  API --> Catalog
  Catalog --> Builder
  Builder --> Web
  Web -->|"listEntity(?query=)"| QueryEngine["Query Engine"]
```

| Layer | Package / path | Role |
| --- | --- | --- |
| Definition | `@repo/entities` | `EntityUIConfig`, validation, default UI fallback |
| Serialization | `serializeEntityDefinition()` | Strips Zod; exposes fields + `ui` to clients |
| Catalog API | `apps/api/src/entities/list-entities.route.ts` | Auth + `*.read` gate; merges module UI extensions and tenant dynamic entities |
| Web registries | `field-component-registry.tsx`, `view-component-registry.tsx` | React component lookup for custom field/view types |
| Interpretation | `@repo/ui-builder` | Columns, forms, filters, query config, permissions |
| Web | `apps/web/app/components/entity/` | React components + component registry |
| Data | `useEntity` + `api-client` | List reads via Query Engine `?query=` JSON |

---

## UI metadata reference

Attach an optional `ui` block to `defineEntity()`:

```ts
export const Organization = defineEntity({
  name: "organization",
  fields: { /* ... */ },
  ui: {
    nav: { label: "Organizations", icon: "building" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "email", "isActive"],
        defaultSort: { field: "name", direction: "asc" },
      },
    ],
    forms: {
      create: { sections: [{ title: "Details", fields: ["name", "email"] }] },
      edit: { sections: [{ title: "Details", fields: ["name", "email"] }] },
    },
    fields: {
      name: { label: "Name", component: "input", placeholder: "Acme Inc." },
      isActive: { label: "Active", component: "toggle" },
    },
  },
});
```

### `EntityUIConfig`

| Key | Description |
| --- | --- |
| `nav.label` | Sidebar label (fallback: formatted entity name) |
| `nav.icon` | Icon key mapped in `use-entity-nav-items.ts` (`building`, `folder`, …) |
| `views[]` | List layouts (`table` or `card`) |
| `forms.create` / `forms.edit` | Sectioned form layouts |
| `fields` | Per-field labels, component overrides, placeholders |
| `detail` | Optional detail field list (extension point) |

### View config

| Field | Description |
| --- | --- |
| `type` | `table` or `card` |
| `name` | View identifier (default: first view) |
| `fields` | Columns / card fields (must exist on entity) |
| `filters` | Filter bar definitions → Query Engine filters |
| `defaultSort` | Initial sort passed to `useEntity` |

### Field components

| `component` | Used for types | Web component |
| --- | --- | --- |
| `input` | `string` | Text input |
| `number` | `number` | Number input |
| `toggle` | `boolean` | Checkbox |
| `date` | `date` | Datetime-local input |
| `relation` | `relation` | `RelationPicker` (async list of target entity) |

When `ui` is omitted, `getDefaultEntityUI()` generates a single table view and basic create/edit forms from editable fields.

Validation: `validateEntityUIConfig()` (Zod + field ref checks). Invalid field references throw at definition time when `ui` is provided.

---

## `@repo/ui-builder`

Pure interpretation helpers (no React):

| Module | Exports |
| --- | --- |
| `view-engine` | `resolveActiveView`, `getTableColumns`, `getViewFilters`, `getDefaultSort` |
| `form-engine` | `resolveCreateForm`, `resolveEditForm`, `buildInitialValues` |
| `layout-engine` | `getFormSections` |
| `permission-adapter` | `resolveEntityActionPermissions`, `isFieldVisible`, `isFieldEditable` |
| `query-config-builder` | `buildListQueryConfig`, `getDefaultFilterOperator` |
| `component-registry` | `resolveComponentId`, `registerComponent` |

---

## Web integration

### Entity catalog

- `EntityCatalogProvider` (private layout) fetches `GET /api/entities` on mount.
- `useEntityCatalog()` — `items`, `getDefinition`, `isKnownEntity`.
- Route guards use `isKnownEntity` for `/app/:entity` param validation.
- Sidebar: `useEntityNavItems()` + `useAccessibleNavItems()` (RBAC-filtered).

### List views

- `EntityPage` owns `useEntity(entityName, { queryConfig })`.
- `EntityTable` / `EntityCardView` build filters/sort → `buildListQueryConfig` → parent refresh.
- Column headers toggle sort; filter inputs map to Query Engine equality/range operators by field type.
- All list reads go through Query Engine (no hardcoded fetch paths).

### Forms

- `EntityForm` resolves sections from `FormEngine`; `EntityField` reads field UI metadata.
- `RelationPicker` loads target entity options via `listEntity(target, { query })`.
- Validation errors come from API responses (`fieldErrors` on `useEntity`).

### Extending components

**Built-in field types** (`input`, `number`, `toggle`, `date`, `relation`) render without registration.

**Custom field components** — register in the web field registry during `bootstrapWebPlatform()`:

```ts
// apps/web/app/platform/bootstrap.ts
registerFieldComponent("BadgeField", BadgeField);
```

Modules declare metadata ids in `defineModule({ ui: { components: { badge: "BadgeField" } } })`. Map field metadata `component: "badge"` — `EntityField` resolves via `@repo/ui-builder` → web registry → built-in fallback.

**Custom view types** — register in `view-component-registry.tsx` and reference `type` in entity or module UI extensions.

**Module UI extensions** — append views and merge field/nav overrides without editing core entity definitions:

```ts
defineModule({
  ui: {
    extend: {
      organization: {
        views: [{ type: "table", name: "inventory-context", fields: ["name", "isActive"] }],
      },
    },
  },
});
```

Merged server-side in `GET /api/entities` via `mergeUiExtensions()`.

---

## Query Engine client

`api-client.listEntity(name, { limit, cursor, query })` serializes `query` as a JSON search param (matches API `parseListQueryInput`).

Example filter from UI filter bar (`organizationId` on projects):

```http
GET /api/project?query={"filter":[{"field":"organizationId","operator":"==","value":"org_123"}],"sort":[{"field":"name","direction":"asc"}],"pagination":{"limit":20}}
```

---

## Security

- `GET /api/entities` requires authentication, tenant context, and any `*.read` permission.
- Response includes only entities the caller may read (`{entity}.read` or superadmin).
- UI hides actions via `useEntityPermissions`; API enforces RBAC on mutations.

---

## Seed entities (dev/test)

| Entity | Relation | Purpose |
| --- | --- | --- |
| `organization` | — | Core module — generic tenant-scoped record |
| `project` | `organizationId` → `organization` | Core module — relation picker + FK filters |
| `inventoryItem` | `organizationId` → `organization` | Inventory module — sample extension entity |

These replace the former Customer/Order pilot fixtures. New entities are added via modules listed in `apps/platform/app.config.ts` without rewriting the UI Builder.

Tenant-specific models created in the Model Builder (`/settings/data-models`) appear in the same catalog and use the same `EntityTable` / `EntityForm` components. Attach action-based hooks via `POST /api/hooks` (see [Hooks System Guide](./hooks-system-guide.md)).

---

## Related

- [Entity System Guide](./entity-system-guide.md)
- [Query Engine Guide](./query-engine-guide.md)
- [Relational Data System Guide](./relational-data-system-guide.md)
- [Module Extension Guide](./module-extension-guide.md)
- [Dynamic Entity Builder Guide](./dynamic-entity-builder-guide.md)
