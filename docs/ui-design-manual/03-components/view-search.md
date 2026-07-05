# Component: view-search

## Purpose

**When to use:** Legacy search-only toolbar. **Prefer `view-filter` with `enableSearch: true`.**

**When not to use:** New designs — use `view-filter`. Filters without search — use `view-filter` with `enableFilters`.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | No |
| `recordDetail` | No |
| `formCreate` | No |
| `formEdit` | No |
| `formPlain` | No |
| `formWizardShell` | No |
| `formWizardStep` | No |
| `formModalFooter` | No |
| `metricStrip` | No |
| `metricRow` | No |
| `metricWidget` | No |
| `dashboardSection` | No |
| `dashboardLayout` | No |

> **Legacy:** Parsed for backward compatibility. Migrated to `view-filter` on import. Not in `componentKindsForSurface` — treat as deprecated.

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `placeholder` | `string` | No |  | Search input placeholder. |
| `styles` | `StyleRule[]` | No |  | Toolbar styling. |

## Interactions

Search binds to URL query param `q`.

## Binding

None — search is global to the active data view.

## Minimal example

```json
{
  "kind": "view-search",
  "placeholder": "Search…"
}
```

## Realistic example

```json
{
  "kind": "view-filter",
  "enableSearch": true,
  "enableFilters": false,
  "searchPlaceholder": "Search accounts…",
  "filters": []
}
```

## Common mistakes

- Creating new `view-search` rows instead of `view-filter`.
- Adjacent `view-search` + `view-filter` — import merges them.
- Expecting `filters` on `view-search` — use `view-filter`.
