# Entity UI components

Schema-driven CRUD UI for business entities registered in [`entity-catalog.ts`](../../entities/entity-catalog.ts).

## Components

| Component                 | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `EntityPage`              | List view with create action, table, delete modal |
| `EntityTable`             | Paginated table with RBAC-gated row actions       |
| `EntityForm`              | Create/edit form with shared Zod validation       |
| `EntityField`             | Maps entity field metadata to UI inputs           |
| `RequireEntityPermission` | Route guard for read/create/update access         |

## Routes

| Path                | Component             |
| ------------------- | --------------------- |
| `/app/{entity}`     | `EntityPage`          |
| `/app/{entity}/new` | `EntityForm` (create) |
| `/app/{entity}/:id` | `EntityForm` (edit)   |

## Adding an entity to the UI

1. Define the entity in `@repo/shared-types` and register API routes in `apps/api`.
2. Add an entry to `ENTITY_CATALOG` in [`entity-catalog.ts`](../../entities/entity-catalog.ts).
3. Add `nav.{entity}` and any labels to i18n locale files (`en` + `es`).
4. Sidebar links are generated automatically from `ENTITY_NAV_ITEMS`.

## Permissions

UI actions are gated with `useEntityPermissions(entityName)`:

- `{entity}.read` — list/detail routes
- `{entity}.create` — create button and `/new` route
- `{entity}.update` — edit actions and edit route
- `{entity}.delete` — delete button

API enforcement remains the source of truth; the UI hides unauthorized controls.

## Related

- [Entity system guide](../../../../docs/entity-system-guide.md)
- [Web app README](../../../README.md)
