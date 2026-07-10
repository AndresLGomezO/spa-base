# Component: view-filters

## Purpose

**When to use:** Entity field filter panel for a data view. Configure which entity fields appear as filter controls.

**When not to use:** Global text search — use `view-search`. Date period selection — use `view-date-filter`.

## Allowed surfaces

Same as `view-search` (list surfaces, main page, record detail, metric surfaces, dashboard).

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `filters` | `ViewFilterEntry[]` | Yes | Default `[]` | Entity + field pairs to expose as filters. |
| `label` | `LabelConfig` | No |  | Optional label for the filter area. |
| `styles` | `StyleRule[]` | No |  | Full styling on filter trigger and container. |

Each `ViewFilterEntry`:

| Name | Type | Required |
|------|------|----------|
| `entityName` | `string` | Yes |
| `fieldName` | `string` | Yes |

## Interactions

Filters bind to URL params `f.{entity}.{field}`. Multiple `view-filters` components on a page merge their filter entries globally (deduped by entity + field).

## Minimal example

```json
{
  "kind": "view-filters",
  "filters": [
    {
      "entityName": "account",
      "fieldName": "accountType"
    }
  ]
}
```

## Realistic example

```json
{
  "kind": "view-filters",
  "filters": [
    { "entityName": "account", "fieldName": "accountType" },
    { "entityName": "account", "fieldName": "currency" }
  ],
  "styles": [
    {
      "property": "backgroundColor",
      "value": "var(--gradient-primary)"
    }
  ]
}
```

## Common mistakes

- Duplicating the same entity field in multiple filter components — creates duplicate UI for the same URL param.
- Expecting filters to work when no `view-filters` component is in the walked layout.
