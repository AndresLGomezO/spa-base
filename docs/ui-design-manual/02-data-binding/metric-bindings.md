# Metric bindings

Metric components display aggregated KPI values. They bind metric definition parameters through `groupBindings` and `dimensionBindings` — not through `primary` DataSource.

**Population scope** (which records count toward the metric) is configured when the definition is created in Settings → Metrics: either all records of `sourceModel`, or records matching a saved custom query (`sourceQueryDefinitionId`). Layout JSON only references `metricDefinitionId`; see [Metric definition sources](./metric-definition-sources.md).

---

## Component kinds

| Kind | Purpose |
|------|---------|
| `metric-kpi` | Single metric definition with parameter bindings (aggregated or computed) |
| `metric-derived-kpi` | Legacy client-side expression over multiple metrics (prefer computed metrics) |
| `metric-widget` | Reference to a pre-built reusable widget (no bindings on the component) |

Computed metrics (e.g. MoM %) are defined in tenant metric JSON with `computationMode: "computed"` and evaluated on the server via `POST /api/metrics/:id/evaluate`. Bind dashboard context through `parameterBindings` on `metric-kpi`.

---

## metric-kpi

```json
{
  "kind": "metric-kpi",
  "metricDefinitionId": "metric_total_revenue",
  "label": "Total Revenue",
  "groupBindings": {
    "region": { "type": "static", "value": "US" }
  },
  "dimensionBindings": {
    "accountId": { "type": "entityField", "fieldPath": "id" },
    "period": { "type": "listFilter", "field": "period" }
  }
}
```

| Property | Required | Description |
|----------|----------|-------------|
| `metricDefinitionId` | Yes | Platform metric definition ID |
| `label` | No | Display label override |
| `groupBindings` | Yes | Map of group parameter names → binding sources (may be `{}`) |
| `dimensionBindings` | Yes | Map of dimension parameter names → binding sources (may be `{}`) |
| `parameterBindings` | No | Map of computed-metric parameter names → binding sources (e.g. `currentPeriod` → `dashboardDateFilter`) |
| `queryParameterBindings` | No | Legacy alias; prefer `parameterBindings` |
| `styles[]` | No | Component styles |

For computed metrics, use `parameterBindings` instead of mapping date buckets through `dimensionBindings`. Comparison periods (e.g. previous month) are derived in the metric definition via `deriveFrom`, not in layout JSON.

```json
{
  "kind": "metric-kpi",
  "metricDefinitionId": "Income MoM %",
  "parameterBindings": {
    "currentPeriod": { "type": "dashboardDateFilter" }
  },
  "groupBindings": {},
  "dimensionBindings": {}
}
```

---

## MetricBindingSource shapes

Each binding key matches a parameter name from the metric definition.

| type | Fields | Value |
|------|--------|-------|
| `static` | `value` | `string` \| `number` \| `boolean` |
| `entityField` | `fieldPath` | Entity field path (typically `"id"` for current record) |
| `listFilter` | `field` | Active list filter field name |
| `routeParam` | `param` | Route parameter name |
| `dashboardDateFilter` | — | Dashboard view-filter date control (month/year/day bucket) |
| `relativePeriod` | `field`, `anchor`, `offset`, `unit` | Shift an anchored date bucket by N periods |

### Examples by source type

**Static group filter:**

```json
"groupBindings": {
  "currency": { "type": "static", "value": "USD" },
  "fiscalYear": { "type": "static", "value": 2025 }
}
```

**Current record dimension:**

```json
"dimensionBindings": {
  "accountId": { "type": "entityField", "fieldPath": "id" }
}
```

**List filter dimension:**

```json
"dimensionBindings": {
  "status": { "type": "listFilter", "field": "status" },
  "dateRange": { "type": "listFilter", "field": "invoiceDate" }
}
```

**Route param:**

```json
"dimensionBindings": {
  "workspaceId": { "type": "routeParam", "param": "workspaceId" }
}
```

---

## metric-derived-kpi

**Legacy.** Prefer a computed metric definition (`computationMode: "computed"`) evaluated on the server. Kept for backward compatibility with existing layouts.

Computes a value from an expression array combining metrics and operators.

```json
{
  "kind": "metric-derived-kpi",
  "label": "Net balance",
  "expression": [
    { "type": "metric", "metricDefinitionId": "total_income" },
    { "type": "operator", "op": "-" },
    { "type": "metric", "metricDefinitionId": "total_outflows" }
  ],
  "groupBindings": {
    "period": { "type": "static", "value": "2025-Q1" }
  },
  "dimensionBindings": {
    "accountId": { "type": "entityField", "fieldPath": "id" }
  }
}
```

### Expression tokens

| type | Fields |
|------|--------|
| `metric` | `metricDefinitionId` |
| `operator` | `op` — e.g. `"+"`, `"-"`, `"*"`, `"/"` |
| `literal` | `value` — numeric constant |

Bindings on `metric-derived-kpi` apply to **all** metrics referenced in the expression unless overridden per-metric in the definition.

---

## metric-widget

References a widget defined in `metricWidgets` on the entity UI config. No bindings on the component itself.

```json
{
  "kind": "metric-widget",
  "entityName": "Account",
  "widgetId": "total-balance-widget"
}
```

Widget definitions hold the layout and metric configuration. The metrics row layout places `metric-widget` components in a grid.

---

## KPI strip in a grid

Three-across metric row inside a container:

```json
{
  "kind": "grid",
  "gridTemplateColumns": "repeat(3, minmax(0, 1fr))",
  "gap": "16px",
  "rows": [
    {
      "type": "component",
      "id": "track-revenue",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-revenue",
            "component": {
              "kind": "metric-kpi",
              "metricDefinitionId": "total_revenue",
              "label": "Revenue",
              "groupBindings": {},
              "dimensionBindings": {
                "accountId": { "type": "entityField", "fieldPath": "id" }
              },
              "styles": [
                { "property": "padding", "value": "var(--spacing-macro)" },
                { "property": "backgroundColor", "value": "muted" },
                { "property": "borderRadius", "value": "var(--radius-lg)" }
              ]
            }
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "track-expenses",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-expenses",
            "component": {
              "kind": "metric-kpi",
              "metricDefinitionId": "total_expenses",
              "label": "Expenses",
              "groupBindings": {},
              "dimensionBindings": {
                "accountId": { "type": "entityField", "fieldPath": "id" }
              }
            }
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "track-net",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-net",
            "component": {
              "kind": "metric-derived-kpi",
              "label": "Net",
              "expression": [
                { "type": "metric", "metricDefinitionId": "total_revenue" },
                { "type": "operator", "op": "-" },
                { "type": "metric", "metricDefinitionId": "total_expenses" }
              ],
              "groupBindings": {},
              "dimensionBindings": {
                "accountId": { "type": "entityField", "fieldPath": "id" }
              }
            }
          }
        ]
      }
    }
  ]
}
```

---

## Binding checklist

- [ ] Every required metric parameter has a binding key (or `{}` if none required)
- [ ] `entityField.fieldPath` matches an entity field appropriate to context (`id` on detail, filter field on list)
- [ ] `listFilter.field` matches an active list filter name
- [ ] `metricDefinitionId` exists in platform metric catalog
- [ ] Derived expressions reference valid metric IDs

---

## Related

- [Metric definition sources](./metric-definition-sources.md) — entity vs custom query population
- [Data sources](./data-sources.md) — display field binding (non-metric)
- [Slots and page components](./slots-and-page-components.md) — `page-metrics` slot
- [Envelope examples](../appendix/envelope-examples.md) — `metricsRowDesigner` surface
