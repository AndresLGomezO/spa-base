# UI Master Plan

Visual layout builder packages and documentation index.

## Documentation

- [UI-Builder-unification-master-plan.md](./UI-Builder-unification-master-plan.md) — **active plan:** unified builder, Section 15 enforcement, phased migration
- [UI-Builder-refactor-enhancement.md](./UI-Builder-refactor-enhancement.md) — architectural principles
- [UIBuilder.md](./UIBuilder.md) — product spec (recursive layout, components, styles, fallbacks)
- [UIBuilderStructure.md](./UIBuilderStructure.md) — monorepo package layout
- [UIBuilderPhase2MasterPlan.md](./UIBuilderPhase2MasterPlan.md) — historical phase 2 notes

## Packages

| Package | Role |
|---------|------|
| `@repo/ui-builder-core` | Types, Zod schema, composition scopes, grid/container primitives, mutations |
| `@repo/ui-builder-renderer` | Production + preview render engine (`RecursiveLayoutRenderer`) |
| `@repo/ui-builder-react` | Builder UI, `createLayoutEditorBinding`, structure panel |
| `@repo/ui-builder` | Legacy metadata engine (target rename: `@repo/ui-metadata`) |

## App integration

- `apps/web/app/features/unified-builder/` — **UnifiedBuilderShell**, `UnifiedDesignerPreviewPanel`, PreviewContext, scope adapters
- `apps/web/app/features/ui-builder/` — entity layout render context and shared preview helpers
- Design layout routes use unified shell via `UnifiedDesignerLayoutTab` (main, detail, dashboard, metrics, item-list on layout tab; form designer in progress)

## Persisted shape

Layouts are `UiLayoutDocument` with `LayoutRootNode` or `ScreenRootNode`. On load:

- **Screen** scope → `ensureStandardRoot("screen", layout)` (`screen-root`)
- **Form** surfaces → `ensureFormLayoutGridOnly(layout)` (container root + `nested-layout` → grid migration)
- **Block/component** scope → `ensureContainerRoot(layout)` (canonical container root; full grid migration in progress)
