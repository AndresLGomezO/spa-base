# Component: metric-kpi

Metric widget KPI bound to a metric definition.

**Properties:** metricDefinitionId, groupBindings, dimensionBindings, label?, styles?

```json
{
  "kind": "metric-kpi",
  "metricDefinitionId": "metric_total_revenue",
  "label": "Total Revenue",
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
    }
  }
}
```
