# Component: metric-derived-kpi

## Purpose

**When to use:** Computed KPI from an expression over multiple metric definitions.

**When not to use:** Single metric — use `metric-kpi`. Entity field math — not supported here.

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
| `expression` | `MetricDerivedExpressionToken[]` | Yes | Tokens: `metric`, `operator`, `constant`, `paren`. | Formula definition. |
| `groupBindings` | `Record<string, MetricBindingSource>` | Yes | May be `{}`. | Shared group bindings. |
| `dimensionBindings` | `Record<string, MetricBindingSource>` | Yes | May be `{}`. | Shared dimension bindings. |
| `terms` | `MetricDerivedTerm[]` | No | Deprecated — migrated to `expression`. | Legacy weighted sum. |
| `label` | `string` | No |  | Display label. |
| `styles` | `StyleRule[]` | No |  | Card framing. |

## Interactions

Read-only computed value.

## Binding

Metric bindings on the component apply to all metrics in `expression`.

## Minimal example

```json
{
  "kind": "metric-derived-kpi",
  "expression": [
    {
      "type": "metric",
      "metricDefinitionId": "total_income"
    },
    {
      "type": "operator",
      "op": "-"
    },
    {
      "type": "metric",
      "metricDefinitionId": "total_outflows"
    }
  ],
  "groupBindings": {},
  "dimensionBindings": {}
}
```

## Realistic example

```json
{
  "kind": "metric-derived-kpi",
  "label": "Net balance",
  "expression": [
    {
      "type": "metric",
      "metricDefinitionId": "total_income"
    },
    {
      "type": "operator",
      "op": "-"
    },
    {
      "type": "metric",
      "metricDefinitionId": "total_outflows"
    }
  ],
  "groupBindings": {
    "period": {
      "type": "static",
      "value": "2025-Q1"
    }
  },
  "dimensionBindings": {
    "accountId": {
      "type": "entityField",
      "fieldPath": "id"
    }
  }
}
```

## Common mistakes

- Invalid expression token sequence (two operators adjacent).
- Referencing metric IDs not in the catalog.
- Relying on deprecated `terms` for new designs.
