# Component: view-filter

## Purpose

**When to use:** Unified search, entity field filters, and optional date filter for a data view.

**When not to use:** Form field filtering. Metric dimension binding — use metric `listFilter` bindings.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | Yes |
| `tableColumnCell` | Yes |
| `tableRowExpand` | Yes |
| `mainPage` | Yes |
| `recordDetail` | Yes |
| `formCreate` | No |
| `formEdit` | No |
| `formPlain` | No |
| `formWizardShell` | No |
| `formWizardStep` | No |
| `formModalFooter` | No |
| `metricStrip` | Yes |
| `metricRow` | Yes |
| `metricWidget` | Yes |
| `dashboardSection` | Yes |
| `dashboardLayout` | Yes |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `enableSearch` | `boolean` | No |  | Show search input (URL `q`). |
| `enableFilters` | `boolean` | No |  | Show entity field filters. |
| `enableDateFilter` | `boolean` | No |  | Show date period filter. |
| `dateFilterGranularity` | `year` \| `month` \| `day` | No | When date filter enabled. | Period selector granularity. |
| `dateFilterParam` | `string` | No | Default matches granularity. | URL param name. |
| `dateFilterLabel` | `LabelConfig` | No |  | Date picker label text, visibility, and position (`above` / `below`). |
| `searchPlaceholder` | `string` | No |  | Search input hint. |
| `filters` | `ViewFilterEntry[]` | Yes | `{ entityName, fieldName }` per filter. | Which filters to expose. |
| `styles` | `StyleRule[]` | No |  | Toolbar/sidebar framing. |

## Interactions

Updates URL state (`q`, `f.{entity}.{field}`, date param). List refreshes on change.

## Binding

Filter entries reference entity fields; runtime resolves options. Not DataSource.

## Minimal example

```json
{
  "kind": "view-filter",
  "enableSearch": true,
  "enableFilters": false,
  "filters": []
}
```

## Realistic example

```json
{
  "kind": "view-filter",
  "enableSearch": true,
  "enableFilters": true,
  "enableDateFilter": true,
  "dateFilterGranularity": "month",
  "dateFilterParam": "month",
  "dateFilterLabel": {
    "show": true,
    "text": "Reporting period",
    "position": "above"
  },
  "searchPlaceholder": "Search invoices…",
  "filters": [
    {
      "entityName": "Invoice",
      "fieldName": "status"
    },
    {
      "entityName": "Invoice",
      "fieldName": "accountId"
    }
  ]
}
```

## Common mistakes

- Empty `filters` with `enableFilters: true` — no filter chips appear.
- Wrong `entityName` — must match the view entity or related filter entity.
- Using display paths in `fieldName` — use top-level field names.
