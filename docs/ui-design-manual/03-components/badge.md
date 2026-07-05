# Component: badge

## Purpose

**When to use:** Show enum or status values as a colored badge.

**When not to use:** Free-form text — use `text`. Metrics — use metric components.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | No |
| `recordDetail` | Yes |
| `formCreate` | Yes |
| `formEdit` | Yes |
| `formPlain` | Yes |
| `formWizardShell` | Yes |
| `formWizardStep` | Yes |
| `formModalFooter` | Yes |
| `metricStrip` | No |
| `metricRow` | Yes |
| `metricWidget` | Yes |
| `dashboardSection` | No |
| `dashboardLayout` | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `primary` | `DataSource` | Yes | Enum/status field. | Badge text source. |
| `fallbacks` | `DataSource[]` | No |  | Default label when empty. |
| `label` | `LabelConfig` | No |  | Field caption. |
| `styles` | `StyleRule[]` | No |  | Base badge styling. |
| `conditionalStyles` | `ConditionalStyleRule[]` | No | `matchValue` per enum value. | Variant per status. |

## Interactions

Read-only display.

## Binding

DataSource. Pair with `conditionalStyles` mapping enum values to `badgeVariant`.

## Minimal example

```json
{
  "kind": "badge",
  "primary": {
    "type": "field",
    "path": "status"
  }
}
```

## Realistic example

```json
{
  "kind": "badge",
  "primary": {
    "type": "field",
    "path": "status"
  },
  "fallbacks": [
    {
      "type": "static",
      "value": "UNKNOWN"
    }
  ],
  "label": {
    "show": true,
    "text": "Status",
    "position": "above"
  },
  "conditionalStyles": [
    {
      "matchValue": "ACTIVE",
      "badgeVariant": "success"
    },
    {
      "matchValue": "PENDING",
      "badgeVariant": "pending"
    },
    {
      "matchValue": "CLOSED",
      "badgeVariant": "closed"
    }
  ]
}
```

## Common mistakes

- Missing `conditionalStyles` for multi-value enums — all badges look the same.
- Using on dashboard card surfaces — `badge` is not in `DASHBOARD_CONTENT_KINDS`.
- `matchValue` not matching exact enum storage value (case-sensitive).
