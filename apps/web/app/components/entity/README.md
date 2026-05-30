# Entity UI components

Registry-driven CRUD UI built from `GET /api/entities` catalog metadata and `@repo/ui-builder`.

See [Advanced UI Builder Guide](../../../../docs/advanced-ui-builder-guide.md).

## Components

| Component                  | Purpose                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `EntityPage`               | List shell: create/edit modals, table/card view, delete modal                                             |
| `EntityTable`              | Schema-driven `@repo/ui` DataTable; offset pagination from parent; one-to-many columns via reverse lookup |
| `EntityCardView`           | Card grid for `views[].type: "card"`                                                                      |
| `EntityForm`               | Create/edit form body (hosted in modal); syncs M2M after save                                             |
| `EntityField`              | Field rendering; routes to pickers by relation type                                                       |
| `RelationPicker`           | FK many-to-one / one-to-one                                                                               |
| `ManyToManyRelationPicker` | M2M via `GET/PUT .../relations/:fieldName`                                                                |
| `RequireEntityPermission`  | Route guard for read/create/update                                                                        |

## Routes

| Path            | Component    |
| --------------- | ------------ |
| `/app/{entity}` | `EntityPage` |

Create and edit open centered modals on the list page. Legacy paths `/app/{entity}/new` and `/app/{entity}/:id` redirect to `?create` and `?edit={id}` on the list route.

Catalog refreshes on entity list (`useRefreshEntityCatalogOnMount`).

## List data flow

`EntityPage` owns page state and builds `QueryConfig` with `pagination.offset`. Filter and sort will live in the parent later; the table is presentational only (`rows`, `totalCount`, `page`, `onPageChange`).

## Adding an entity

1. **Dynamic (default):** **Settings → Data Model Builder** — no web code changes.
2. **Static (optional module):** Define in `modules/{name}/`, add to `app.config.ts`, restart API.

Nav labels come from `ui.nav.label`. Do not hardcode entity links in the web app.

## Related

- [relational-data-system-guide.md](../../../../docs/relational-data-system-guide.md)
- [Web app README](../../../README.md)
