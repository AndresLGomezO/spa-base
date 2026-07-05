# Component: metric-kpi

## Purpose

**When to use:** Single aggregated KPI from a platform metric definition.

**When not to use:** Raw entity field values — use `numeric`. Multi-metric math — use `metric-derived-kpi`.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | Yes |
| `tableColumnCell` | Yes |
| `tableRowExpand` | Yes |
| `mainPage` | No |
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
| `metricDefinitionId` | `string` | Yes | Must exist in metric catalog. | Which metric to compute. |
| `groupBindings` | `Record<string, MetricBindingSource>` | Yes | May be `{}`. | Group parameter values. |
| `dimensionBindings` | `Record<string, MetricBindingSource>` | Yes | May be `{}`. | Dimension parameter values. |
| `label` | `string` | No |  | Display label override. |
| `showToneColors` | `boolean` | No | Default false. | Color value from sign (see `tonePolarity`). |
| `tonePolarity` | `"normal"` \| `"inverted"` | No | Default `"normal"`. | `normal`: positive = success, negative = danger. `inverted`: flip (e.g. expense MoM). |
| `styles` | `StyleRule[]` | No |  | Card framing. |

## Interactions

Read-only. Value refreshes with filter/route context.

## Binding

Uses `groupBindings` / `dimensionBindings` (`static`, `entityField`, `listFilter`, `routeParam`). Not DataSource.

## Minimal example

```json
{
  "kind": "metric-kpi",
  "metricDefinitionId": "metric_total_revenue",
  "groupBindings": {},
  "dimensionBindings": {}
}
```

## Realistic example

```json
{
  "kind": "metric-kpi",
  "metricDefinitionId": "metric_total_revenue",
  "label": "Revenue",
  "groupBindings": {
    "region": {
      "type": "static",
      "value": "US"
    }
  },
  "dimensionBindings": {
    "accountId": {
      "type": "entityField",
      "fieldPath": "id"
    },
    "period": {
      "type": "listFilter",
      "field": "period"
    }
  },
  "styles": [
    {
      "property": "padding",
      "value": "var(--spacing-macro)"
    },
    {
      "property": "backgroundColor",
      "value": "muted"
    },
    {
      "property": "borderRadius",
      "value": "var(--radius-lg)"
    }
  ]
}
```

## Common mistakes

- Empty `metricDefinitionId`.
- Missing required binding keys defined on the metric.
- Using `primary` DataSource instead of metric bindings.
