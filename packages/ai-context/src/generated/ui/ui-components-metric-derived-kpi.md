# Component: metric-derived-kpi

Derived metric KPI computed from an expression over multiple metric definitions.

**Properties:** expression, groupBindings, dimensionBindings, label?, styles?

```json
{
  "kind": "metric-derived-kpi",
  "label": "Net balance",
  "expression": [
    {
      "type": "metric",
      "metricDefinitionId": "income"
    },
    {
      "type": "operator",
      "op": "-"
    },
    {
      "type": "metric",
      "metricDefinitionId": "outflows"
    }
  ],
  "groupBindings": {
    "date": {
      "type": "static",
      "value": "2025-09"
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
