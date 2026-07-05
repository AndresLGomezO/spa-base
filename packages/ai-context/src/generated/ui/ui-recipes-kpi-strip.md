# Horizontal KPI strip

## Goal

Build a **horizontal KPI row** that displays multiple `metric-kpi` values side by side in a single grid strip. Optionally include `metric-derived-kpi` for computed totals.

## When to use

- Entity main pages (`page-metrics` slot) or record contexts that need at-a-glance aggregates.
- Metrics row designer surface where `metricRowLayout` defines the visual strip.

## Step-by-step

1. **Identify metric definitions** — choose `metricDefinitionId` values from the platform catalog (entity- or query-backed; see [metric definition sources](../02-data-binding/metric-definition-sources.md)). Note required `groupBindings` and `dimensionBindings` parameter names.
2. **Start metricRowLayout root** — column `root` with `columnCount: 1` and one `container` at `columns[0].rows[0]`.
3. **Add a horizontal grid** — inside the container, add `grid` with `gridTemplateColumns: "repeat(3, minmax(0, 1fr))"` (adjust count to match KPIs) and `gap: "16px"`.
4. **One track per KPI** — each grid track is a `container` with one `metric-kpi` row. Never place multiple KPIs in the same track unless stacking intentionally.
5. **Bind dimensions** — set `dimensionBindings` to scope metrics to the current record (`entityField` / `fieldPath: "id"`) or active list filters (`listFilter`).
6. **Add derived KPIs (optional)** — use `metric-derived-kpi` with an `expression` array for net/margin calculations; reuse the same binding maps.
7. **Register widgets (optional)** — if using `metric-widget`, define entries in `metricWidgets[]` and reference them by `widgetId` in the layout.

## Layout sketch

```
metricRowLayout.root
└── container
    └── grid (repeat(3, 1fr))
        ├── track-1 → container → metric-kpi (Revenue)
        ├── track-2 → container → metric-kpi (Expenses)
        └── track-3 → container → metric-derived-kpi (Net)
```

## Full envelope example

```json
{
  "kind": "design-layout-slice",
  "surface": "metricsRowDesigner",
  "version": 1,
  "data": {
    "metricWidgets": [],
    "metricRowLayout": {
      "root": {
        "type": "root",
        "id": "metrics-root",
        "columnCount": 1,
        "columns": [
          {
            "id": "col-1",
            "rows": [
              {
                "type": "component",
                "id": "row-container",
                "component": {
                  "kind": "container",
                  "rows": [
                    {
                      "type": "component",
                      "id": "row-grid",
                      "component": {
                        "kind": "grid",
                        "gridTemplateColumns": "repeat(3, minmax(0, 1fr))",
                        "gap": "16px",
                        "alignItems": "stretch",
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
                                      "accountId": {
                                        "type": "entityField",
                                        "fieldPath": "id"
                                      }
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
                                      "accountId": {
                                        "type": "entityField",
                                        "fieldPath": "id"
                                      }
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
                                      {
                                        "type": "metric",
                                        "metricDefinitionId": "total_revenue"
                                      },
                                      { "type": "operator", "op": "-" },
                                      {
                                        "type": "metric",
                                        "metricDefinitionId": "total_expenses"
                                      }
                                    ],
                                    "groupBindings": {},
                                    "dimensionBindings": {
                                      "accountId": {
                                        "type": "entityField",
                                        "fieldPath": "id"
                                      }
                                    },
                                    "styles": [
                                      { "property": "padding", "value": "var(--spacing-macro)" },
                                      { "property": "backgroundColor", "value": "muted" },
                                      { "property": "borderRadius", "value": "var(--radius-lg)" },
                                      { "property": "fontWeight", "value": "bold" }
                                    ]
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  }
}
```

## Binding quick reference

| Context | Typical dimension binding |
|---------|---------------------------|
| Record detail / scoped row | `{ "type": "entityField", "fieldPath": "id" }` |
| List-level metrics | `{ "type": "listFilter", "field": "<filterField>" }` |
| Static segment | `{ "type": "static", "value": "USD" }` in `groupBindings` |

## Checklist

- [ ] `metricRowLayout` uses column root → single `container` → `grid`
- [ ] `grid.rows.length` matches the number of KPI tracks
- [ ] Every `metric-kpi` has `metricDefinitionId`, `groupBindings`, and `dimensionBindings` (may be `{}`)
- [ ] Binding keys match metric definition parameter names
- [ ] Derived KPI expressions reference valid `metricDefinitionId` values
- [ ] No `primary` DataSource on metric components — bindings only

## Related

- [Metric bindings](../02-data-binding/metric-bindings.md) — binding source shapes and KPI strip grid
- [Slots and page components](../02-data-binding/slots-and-page-components.md) — `page-metrics` slot
- [Envelope examples](../appendix/envelope-examples.md) — `metricsRowDesigner` surface

**Surfaces:** `metricsRowDesigner`