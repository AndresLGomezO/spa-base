# UI Master Plan

Visual layout builder packages and documentation index.

## Documentation

- [UIBuilder.md](./UIBuilder.md) — product spec (recursive layout, components, styles, fallbacks)
- [UIBuilderStructure.md](./UIBuilderStructure.md) — monorepo package layout
- [UIBuilderPhase2MasterPlan.md](./UIBuilderPhase2MasterPlan.md) — **next phases:** detail page, forms, unified list item, motion

## Packages

| Package | Role |
|---------|------|
| `@repo/ui-builder-core` | Types, Zod schema, resolvers, validation, builder mutations |
| `@repo/ui-builder-renderer` | Production + preview render engine (`RecursiveLayoutRenderer`) |
| `@repo/ui-builder-react` | Builder UI (`UiLayoutStructurePanel`, column/row editors) |
| `@repo/ui-builder` | Catalog/table/form/query engine (unchanged; not the visual builder) |

## App integration

- `apps/web/app/features/ui-builder/` — entity card view adapter and `EntityCardLayoutBuilder`
- `EntityLayoutCardView` — list card rendering
- **Design layout** (sidebar) — `/settings/design-layout/{list|page|forms}/:entityName` (primary configuration surface)
- Entity list header **Design layout** link — `/settings/design-layout/list/:entityName` (same editor; requires `entityUiOverride.update`)
  - Requires `entityUiOverride.read` (+ per-entity `.read` for nav links)
  - Save requires `entityUiOverride.update` (or admin / superadmin)
  - **Item list** — unified **list item** layout + table/card/compact presentation (`EntityListLayoutDesignEditor`)
  - **Main View** — main page layout builder (`EntityMainPageLayoutDesignEditor`)
  - **Detailed View** — record detail layout builder (`EntityRecordDetailLayoutDesignEditor`)
  - **Forms** — Form Designer (`FormDesignerView`): shared layout for create/edit, wizard shell + steps, tabbed settings/layout/components UX with preview

## Persisted shape

Card views store `ViewConfig.layout` as `UiLayoutDocument` (columns → rows → components / nested columns).
