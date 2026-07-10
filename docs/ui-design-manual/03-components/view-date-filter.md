# Component: view-date-filter

## Purpose

**When to use:** Date period filter (year, month, or day) for dashboard data views and metric bindings.

**When not to use:** Record field date display — use `date` component. Search or entity filters — use `view-search` / `view-filters`.

## Allowed surfaces

Same as `view-search` (list surfaces, main page, record detail, metric surfaces, dashboard).

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `dateFilterGranularity` | `year` \| `month` \| `day` | No | Default `month` | Period selector granularity. |
| `dateFilterParam` | `string` | No | Default matches granularity | URL param name (`year`, `month`, or `date`). |
| `label` | `LabelConfig` | No |  | Date picker label text, visibility, and position. |
| `styles` | `StyleRule[]` | No |  | Full styling on date picker chrome. |

## Interactions

Binds to a URL query param. The first `view-date-filter` in layout walk order defines the URL param name and granularity. All date filter components share the same page state.

## Minimal example

```json
{
  "kind": "view-date-filter",
  "dateFilterGranularity": "month"
}
```

## Realistic example

```json
{
  "kind": "view-date-filter",
  "dateFilterGranularity": "month",
  "dateFilterParam": "month",
  "label": {
    "show": true,
    "text": "Reporting period",
    "position": "above"
  }
}
```

## Common mistakes

- Placing multiple date filters with different URL params — only the first instance's param config is used.
- Using on form surfaces — not allowed on form design surfaces.
