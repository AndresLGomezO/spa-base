# Component: view-search

## Purpose

**When to use:** Global search input for a data view. Place independently in the layout toolbar or any allowed surface.

**When not to use:** Entity field filters — use `view-filters`. Date period selection — use `view-date-filter`.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | Yes |
| `tableColumnCell` | Yes |
| `tableRowExpand` | Yes |
| `mainPage` | Yes |
| `recordDetail` | Yes |
| `metricStrip` | Yes |
| `metricRow` | Yes |
| `metricWidget` | Yes |
| `dashboardSection` | Yes |
| `dashboardLayout` | Yes |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `placeholder` | `string` | No |  | Search input placeholder. |
| `label` | `LabelConfig` | No |  | Optional label above/below the search field. |
| `styles` | `StyleRule[]` | No |  | Full styling (background, border, shadow, etc.). |

## Interactions

Search binds to URL query param `q`. Search columns are built from all entities in the tenant catalog when at least one `view-search` component exists in the layout.

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
  "kind": "view-search",
  "placeholder": "Search accounts…",
  "label": {
    "show": true,
    "text": "Search",
    "position": "above"
  },
  "styles": [
    {
      "property": "borderColor",
      "value": "primary"
    },
    {
      "property": "borderWidth",
      "value": "1px"
    }
  ]
}
```

## Common mistakes

- Expecting per-entity search field configuration — searchable fields are inferred globally.
- Placing search without any `view-search` component and expecting URL `q` to affect list queries.
