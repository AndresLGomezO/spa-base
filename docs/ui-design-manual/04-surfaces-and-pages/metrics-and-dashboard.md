# Metrics and dashboard

Metrics appear in three contexts: the **entity metrics row** above a list, **reusable metric widgets**, and the **tenant dashboard**. Each uses distinct design surfaces and persistence locations.

**Metric definitions** (what to aggregate and from which population) are authored in **Settings → Metrics**, not in layout JSON. Layout components reference `metricDefinitionId` only. Definitions may be **entity-scoped** (`sourceModel`) or **query-scoped** (`sourceQueryDefinitionId` + matching `sourceModel`). See [Metric definition sources](../02-data-binding/metric-definition-sources.md).

---

## Entity metrics row

The metrics row renders above the entity list via the `page-metrics` slot on the main page. It combines widget definitions with a row layout that places metric components in a grid.

Envelope surface: `metricsRowDesigner`.

Persistence keys on `entity_ui_overrides`:

| Key | Description |
|-----|-------------|
| `metricWidgets` | Reusable widget definitions (`id`, `name`, `layout`) |
| `metricRowLayout` | Row layout placing `metric-kpi`, `metric-derived-kpi`, and `metric-widget` refs |

### Surfaces

| Surface | Scope | Role |
|---------|-------|------|
| `metricRow` | Block | Row layout authoring |
| `metricWidget` | Component | Inner layout of a reusable widget |
| `metricStrip` | Block | Legacy inline strip (prefer `metricRow`) |

### Envelope example

```json
{
  "kind": "design-layout-slice",
  "surface": "metricsRowDesigner",
  "version": 1,
  "data": {
    "metricWidgets": [
      {
        "id": "total-balance-widget",
        "name": "Total Balance",
        "layout": {
          "root": {
            "type": "root",
            "id": "widget-root",
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
                          "id": "row-kpi",
                          "component": {
                            "kind": "metric-kpi",
                            "metricDefinitionId": "account_balance",
                            "label": "Balance",
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
            ]
          }
        }
      }
    ],
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
                        "rows": [
                          {
                            "type": "component",
                            "id": "track-balance",
                            "component": {
                              "kind": "container",
                              "rows": [
                                {
                                  "type": "component",
                                  "id": "row-widget",
                                  "component": {
                                    "kind": "metric-widget",
                                    "entityName": "Account",
                                    "widgetId": "total-balance-widget"
                                  }
                                }
                              ]
                            }
                          },
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

### Component roles

| Kind | Bindings | Use |
|------|----------|-----|
| `metric-kpi` | `metricDefinitionId`, `groupBindings`, `dimensionBindings` | Single metric value |
| `metric-derived-kpi` | `expression[]`, bindings | Computed metric from expression |
| `metric-widget` | `entityName`, `widgetId` | Reference to a `metricWidgets[]` entry |

Widget definitions hold the inner layout (surface: `metricWidget`). The row layout places `metric-widget` references alongside inline KPIs.

Preset `kpi-strip` seeds a single-track `metric-kpi` row for quick starts.

---

## Tenant dashboard

The tenant dashboard is a full-page experience outside entity UI overrides. It persists on `tenant_dashboard_layouts`.

| Key | Description |
|-----|-------------|
| `dashboardLayout` | Page shell (`screen-root`) with `dashboard-section` placeholders |
| `dashboardSections[]` | Named sections, each with `id`, `name`, and `layout` |

### Surfaces

| Surface | Scope | Role |
|---------|-------|------|
| `dashboardLayout` | Screen | Page shell and section placement |
| `dashboardSection` | Section | Section content layout |

Allowed kinds include display components, `user`, `metric-kpi`, `metric-derived-kpi`, `metric-widget`, and `view-filter`. The layout shell additionally allows `dashboard-section`.

### Dashboard layout example

```json
{
  "root": {
    "type": "screen-root",
    "id": "dashboard-screen",
    "gridTemplateColumns": "1fr",
    "gap": "24px",
    "rows": [
      {
        "type": "component",
        "id": "track-overview",
        "component": {
          "kind": "container",
          "rows": [
            {
              "type": "component",
              "id": "row-section-overview",
              "component": {
                "kind": "dashboard-section",
                "sectionId": "overview"
              }
            }
          ]
        }
      },
      {
        "type": "component",
        "id": "track-details",
        "component": {
          "kind": "container",
          "rows": [
            {
              "type": "component",
              "id": "row-section-activity",
              "component": {
                "kind": "dashboard-section",
                "sectionId": "activity"
              }
            }
          ]
        }
      }
    ]
  }
}
```

### Dashboard section example

```json
{
  "id": "overview",
  "name": "Overview",
  "layout": {
    "root": {
      "type": "root",
      "id": "section-root",
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
                      "gridTemplateColumns": "repeat(4, minmax(0, 1fr))",
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
                                  "dimensionBindings": {}
                                }
                              }
                            ]
                          }
                        },
                        {
                          "type": "component",
                          "id": "track-users",
                          "component": {
                            "kind": "container",
                            "rows": [
                              {
                                "type": "component",
                                "id": "row-users",
                                "component": {
                                  "kind": "metric-kpi",
                                  "metricDefinitionId": "active_users",
                                  "label": "Active Users",
                                  "groupBindings": {},
                                  "dimensionBindings": {}
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
```

**Design notes:**

- `dashboard-section` components in the shell reference section `id` values from `dashboardSections[]`.
- Section layouts use column `root` → `container` → `grid` for KPI grids.
- Dashboard metrics typically use empty bindings when scoped to tenant-wide aggregates.

---

## Metrics checklist

- [ ] `metricWidgets[].id` values match `metric-widget.widgetId` references in the row layout
- [ ] Every metric component has `groupBindings` and `dimensionBindings` (may be `{}`)
- [ ] `metricDefinitionId` values exist in the platform metric catalog (entity- or query-backed)
- [ ] Dashboard section IDs match between shell placeholders and section definitions
- [ ] KPI grids use `repeat(N, minmax(0, 1fr))` for equal-width tracks

---

## Related

- [Metric bindings](../02-data-binding/metric-bindings.md) — binding source shapes
- [Metric definition sources](../02-data-binding/metric-definition-sources.md) — entity vs custom query population
- [Slots and page components](../02-data-binding/slots-and-page-components.md) — `page-metrics` slot
- [Platform presets](../06-presets/platform-presets.md) — `kpi-strip`
- [Entity UI overrides](../05-persistence/entity-ui-overrides.md) — `metricWidgets`, `metricRowLayout`
