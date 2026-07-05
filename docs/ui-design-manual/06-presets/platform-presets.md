# Platform presets

The platform ships six **built-in component templates**. Each preset generates a starter `UiLayoutDocument` and, where applicable, sets the presentation metadata (`listViewType`, `presentation`) that must stay aligned with the layout shape.

Built-in presets are not stored in Firestore — they are resolved at runtime from the global template registry.

---

## Preset catalog

| ID | Label | Default | Surfaces | Sets |
|----|-------|---------|----------|------|
| `plain-form` | Plain form | Yes | `formPlain`, `formCreate`, `formEdit`, `formWizardStep` | `presentation: "plain"` |
| `plain-table-list` | Plain table list | Yes | `listItem` | `listViewType: "table"` |
| `card-list` | Card list | — | `listItem` | `listViewType: "card"` + two-track grid + `showActions` |
| `expandable-table-list` | Expandable row | — | `listItem`, `tableRowExpand` | `listViewType: "expandableTable"` |
| `wizard-form` | Wizard form | — | `formWizardShell` | `presentation: "wizard"` + wizard shell |
| `kpi-strip` | KPI strip | — | `metricRow`, `metricStrip` | horizontal `metric-kpi` layout |

Pick a preset before customizing. Do not override `presentation` or `listViewType` independently when a preset already defines them.

---

## plain-form

**Sets:** `presentation: "plain"`

Generates a vertical stack of `form-field` rows (one per entity field path) followed by `form-actions`.

```json
{
  "root": {
    "type": "root",
    "id": "form-root",
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
                  "id": "row-name",
                  "component": {
                    "kind": "form-field",
                    "fieldPath": "name"
                  }
                },
                {
                  "type": "component",
                  "id": "row-actions",
                  "component": { "kind": "form-actions" }
                }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

**Customize by:** inserting a `grid` for multi-column fields, adding `form-section` dividers, or wrapping fields in container tracks.

---

## plain-table-list

**Sets:** `listViewType: "table"`

Generates labeled `text` rows — one per column field path — inside the list item cell layout.

```json
{
  "root": {
    "type": "root",
    "id": "cell-root",
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
                  "id": "row-name",
                  "component": {
                    "kind": "text",
                    "primary": { "type": "field", "path": "name" },
                    "label": { "show": true }
                  }
                },
                {
                  "type": "component",
                  "id": "row-status",
                  "component": {
                    "kind": "text",
                    "primary": { "type": "field", "path": "status" },
                    "label": { "show": true }
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
```

**Customize by:** changing display kinds (`numeric`, `date`, `badge`) per field, or adjusting labels.

---

## card-list

**Sets:** `listViewType: "card"`, `showActions: true`

Generates a two-track grid (`minmax(0, 2fr) minmax(0, 1fr)`) with primary fields in the left track and an emphasized field in the right track.

```json
{
  "showActions": true,
  "root": {
    "type": "root",
    "id": "card-root",
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
                    "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
                    "gap": "12px",
                    "rows": [
                      {
                        "type": "component",
                        "id": "track-left",
                        "component": {
                          "kind": "container",
                          "rows": [
                            {
                              "type": "component",
                              "id": "row-name",
                              "component": {
                                "kind": "text",
                                "primary": { "type": "field", "path": "name" },
                                "label": { "show": true }
                              }
                            }
                          ]
                        }
                      },
                      {
                        "type": "component",
                        "id": "track-right",
                        "component": {
                          "kind": "container",
                          "rows": [
                            {
                              "type": "component",
                              "id": "row-emphasis",
                              "component": {
                                "kind": "text",
                                "primary": { "type": "field", "path": "name" },
                                "styles": [{ "property": "fontWeight", "value": "bold" }]
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
```

**Customize by:** swapping right-track content to `badge` for status, adding numeric fields with `displayFormat`, or adjusting track proportions.

---

## expandable-table-list

**Sets:** `listViewType: "expandableTable"`

Seeds the **row expand panel** with a single-track grid containing labeled text rows for secondary fields. Column `cellLayout` documents are authored separately per column.

```json
{
  "root": {
    "type": "root",
    "id": "expand-root",
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
                    "gridTemplateColumns": "1fr",
                    "rows": [
                      {
                        "type": "component",
                        "id": "track-detail",
                        "component": {
                          "kind": "container",
                          "rows": [
                            {
                              "type": "component",
                              "id": "row-status",
                              "component": {
                                "kind": "text",
                                "primary": { "type": "field", "path": "status" },
                                "label": { "show": true }
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
```

**Customize by:** expanding to multi-track grids in the expand panel, or designing per-column `cellLayout` documents for the grouped table.

---

## wizard-form

**Sets:** `presentation: "wizard"`

Generates the wizard shell with a two-track grid: progress in the left track, step host and actions in the right track. Includes one default step with `form-field` rows.

Shell layout:

```json
{
  "root": {
    "type": "root",
    "id": "wizard-shell-root",
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
                    "gridTemplateColumns": "minmax(0, 1fr) minmax(0, 2fr)",
                    "rows": [
                      {
                        "type": "component",
                        "id": "track-progress",
                        "component": {
                          "kind": "container",
                          "rows": [
                            {
                              "type": "component",
                              "id": "row-progress",
                              "component": { "kind": "wizard-progress" }
                            }
                          ]
                        }
                      },
                      {
                        "type": "component",
                        "id": "track-content",
                        "component": {
                          "kind": "container",
                          "rows": [
                            {
                              "type": "component",
                              "id": "row-host",
                              "component": { "kind": "wizard-step-host" }
                            },
                            {
                              "type": "component",
                              "id": "row-actions",
                              "component": { "kind": "wizard-actions" }
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
```

**Customize by:** adding steps to `wizard.steps[]`, moving actions to `modalFooterLayout`, or adjusting track proportions.

---

## kpi-strip

**Sets:** horizontal metric KPI row (no presentation enum)

Generates a single `metric-kpi` component row using the first field path as a binding hint.

```json
{
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
                  "id": "row-kpi",
                  "component": {
                    "kind": "metric-kpi",
                    "metricDefinitionId": "example_metric",
                    "label": "KPI",
                    "groupBindings": {},
                    "dimensionBindings": {}
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
```

**Customize by:** wrapping multiple KPIs in a `grid` with `repeat(N, minmax(0, 1fr))`, adding `metric-widget` references, or defining reusable widgets in `metricWidgets[]`.

---

## Applying presets

1. Select the preset in the designer or reference it in a `design-layout-slice` envelope.
2. Confirm `listViewType` or `presentation` matches the preset (do not override).
3. Customize layout inside the generated document.
4. Export or save when the layout validates on the target surface.

---

## Related

- [List views](../04-surfaces-and-pages/list-views.md) — list envelope examples
- [Forms](../04-surfaces-and-pages/forms.md) — form envelope examples
- [Metrics and dashboard](../04-surfaces-and-pages/metrics-and-dashboard.md) — metrics row detail
- [Tenant presets](./tenant-presets.md) — custom saved templates
