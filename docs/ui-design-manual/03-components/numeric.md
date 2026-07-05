# Component: numeric

## Purpose

**When to use:** Display numbers with currency, percentage, or plain formatting.

**When not to use:** Editable amounts — use `form-field`. KPI aggregates — use `metric-kpi`.

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
| `primary` | `DataSource` | Yes | Numeric field or static. | Value source. |
| `fallbacks` | `DataSource[]` | No |  | Fallback values. |
| `displayFormat` | `currency` \| `plain` \| `percentage` | No |  | Number formatting. |
| `showCurrency` | `boolean` | No | Default false. | Append currency code suffix. |
| `showToneColors` | `boolean` | No | Default false. | Color positive/negative. |
| `label` | `LabelConfig` | No |  | Caption. |
| `styles` | `StyleRule[]` | No |  | Alignment, weight. |
| `conditionalStyles` | `ConditionalStyleRule[]` | No |  | Threshold styling. |

## Interactions

Read-only display.

## Binding

DataSource. Use `displayFormat: "currency"` with entity currency context.

## Minimal example

```json
{
  "kind": "numeric",
  "primary": {
    "type": "field",
    "path": "amount"
  }
}
```

## Realistic example

```json
{
  "kind": "numeric",
  "primary": {
    "type": "field",
    "path": "balance"
  },
  "displayFormat": "currency",
  "showCurrency": true,
  "showToneColors": true,
  "label": {
    "show": true,
    "text": "Balance",
    "position": "above",
    "align": "right"
  }
}
```

## Common mistakes

- Using on dashboard card surfaces — `numeric` is not in `DASHBOARD_CONTENT_KINDS`.
- `displayFormat: "currency"` without currency context in layout.
- Binding text fields — value must be numeric.
