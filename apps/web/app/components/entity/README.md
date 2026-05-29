# Entity UI components

Registry-driven CRUD UI built from `GET /api/entities` catalog metadata and `@repo/ui-builder`.

See [Advanced UI Builder Guide](../../../../docs/advanced-ui-builder-guide.md) for the full metadata reference.

## Components

| Component                 | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `EntityPage`              | List shell: create action, table/card view, delete modal |
| `EntityTable`             | Query Engine–backed table with sort, filters, pagination |
| `EntityCardView`          | Card grid layout for `views[].type: "card"`              |
| `EntityForm`              | Create/edit form from `ui.forms` sections                |
| `EntityField`             | Maps field metadata + `ui.fields` to inputs              |
| `RelationPicker`          | Async select for `type: "relation"` fields               |
| `RequireEntityPermission` | Route guard for read/create/update access                |

## Routes

| Path                | Component             |
| ------------------- | --------------------- |
| `/app/{entity}`     | `EntityPage`          |
| `/app/{entity}/new` | `EntityForm` (create) |
| `/app/{entity}/:id` | `EntityForm` (edit)   |

Unknown `{entity}` values (not in catalog) render `entity-not-found`.

## Adding an entity to the UI

1. Define the entity in a module (`modules/{name}/`) with optional `ui` metadata; list the module in `apps/platform/app.config.ts`.
2. Wire a Firestore converter (or use `createEntityConverter()` from `@repo/firestore-converters`).
3. RBAC permissions are derived automatically from registered entities.
4. Restart API — catalog, sidebar, and routes update automatically from `GET /api/entities`.

Do **not** add hardcoded entries to the web app. Nav labels come from `ui.nav.label`.

## Permissions

UI actions use `useEntityPermissions(entityName)`:

- `{entity}.read` — list/detail routes
- `{entity}.create` — create button and `/new` route
- `{entity}.update` — edit actions and edit route
- `{entity}.delete` — delete button

API enforcement remains the source of truth.

## Related

- [Advanced UI Builder Guide](../../../../docs/advanced-ui-builder-guide.md)
- [Entity system guide](../../../../docs/entity-system-guide.md)
- [Web app README](../../../README.md)
