# Envelope examples

Design-layout-slice envelopes wrap surface-specific data for import, export, and AI handoff. Every envelope shares the same outer shape; only `surface` and `data` differ.

---

## Common envelope shape

```json
{
  "kind": "design-layout-slice",
  "surface": "<surface>",
  "version": 1,
  "data": {}
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `kind` | Yes | Always `"design-layout-slice"` |
| `surface` | Yes | Target surface (see table below) |
| `version` | Yes | Always `1` |
| `formDesignId` | No | Required when updating a specific form design variant |
| `data` | Yes | Surface-specific payload |

### Surfaces

| `surface` value | `data` shape |
|-----------------|--------------|
| `list` | `ListSliceData` |
| `forms` | `FormsSliceData` |
| `mainPage` | `MainPageSliceData` |
| `recordDetail` | `RecordDetailSliceData` |
| `metricsRowDesigner` | `MetricsRowDesignerSliceData` |

---

## list

Controls list presentation type, table columns, expandable table config, and optional card layout.

```json
{
  "kind": "design-layout-slice",
  "surface": "list",
  "version": 1,
  "data": {
    "listViewType": "card",
    "table": {
      "fields": ["name", "status", "amount", "createdAt"],
      "showActions": true
    },
    "expandableTable": {
      "columns": [
        {
          "id": "col-primary",
          "label": "Account",
          "cellLayout": {
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
                              "primary": { "type": "field", "path": "name" }
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
        },
        {
          "id": "col-amount",
          "label": "Amount",
          "displayFrom": "sm",
          "displayTo": "xl",
          "cellLayout": {
            "root": {
              "type": "root",
              "id": "cell-amount-root",
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
                            "id": "row-amount",
                            "component": {
                              "kind": "numeric",
                              "primary": { "type": "field", "path": "amount" },
                              "displayFormat": "currency"
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
      "rowExpandLayout": {
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
                        "id": "row-detail",
                        "component": {
                          "kind": "text",
                          "primary": { "type": "field", "path": "description" },
                          "label": { "show": true, "text": "Description" }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      },
      "showActions": true
    },
    "listItem": {
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
                                  "id": "row-status",
                                  "component": {
                                    "kind": "badge",
                                    "primary": { "type": "field", "path": "status" }
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

**Notes:**

- `listViewType`: `table` | `card` | `expandableTable` | `compact` (`compact` maps to expandable table)
- `table.fields` required even for card view (drives column metadata)
- `listItem` required for card presentation
- `expandableTable` required structurally; used when `listViewType` is `expandableTable` or `compact`

---

## forms

Plain or wizard form configuration. Optional `formDesignId` targets a named form design.

```json
{
  "kind": "design-layout-slice",
  "surface": "forms",
  "version": 1,
  "formDesignId": "quick-create",
  "data": {
    "presentation": "plain",
    "modalSize": "md",
    "layout": {
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
                      "id": "row-grid",
                      "component": {
                        "kind": "grid",
                        "gridTemplateColumns": "1fr 1fr",
                        "gap": "16px",
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
                                    "kind": "form-field",
                                    "fieldPath": "name"
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
                                  "id": "row-status",
                                  "component": {
                                    "kind": "entity-field-selector",
                                    "fieldPath": "status",
                                    "layout": "mini-cards",
                                    "cardsPerRow": 2
                                  }
                                }
                              ]
                            }
                          }
                        ]
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
  }
}
```

### Wizard variant (data only)

```json
{
  "presentation": "wizard",
  "modalSize": "lg",
  "wizard": {
    "shellLayout": {
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
                      "id": "row-progress",
                      "component": { "kind": "wizard-progress" }
                    },
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
        ]
      }
    },
    "steps": [
      {
        "id": "step-details",
        "label": "Details",
        "layout": {
          "root": {
            "type": "root",
            "id": "step-root",
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
    ]
  }
}
```

---

## mainPage

```json
{
  "kind": "design-layout-slice",
  "surface": "mainPage",
  "version": 1,
  "data": {
    "mainPage": {
      "root": {
        "type": "screen-root",
        "id": "screen-main",
        "gridTemplateColumns": "1fr",
        "rows": [
          {
            "type": "component",
            "id": "track-main",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-header",
                  "component": { "kind": "page-header" }
                },
                {
                  "type": "component",
                  "id": "row-toolbar",
                  "component": { "kind": "page-toolbar" }
                },
                {
                  "type": "component",
                  "id": "row-metrics",
                  "component": { "kind": "page-metrics" }
                },
                {
                  "type": "component",
                  "id": "row-list",
                  "component": { "kind": "page-list" }
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```

---

## recordDetail

```json
{
  "kind": "design-layout-slice",
  "surface": "recordDetail",
  "version": 1,
  "data": {
    "recordDetail": {
      "root": {
        "type": "root",
        "id": "detail-root",
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
                        "gap": "24px",
                        "rows": [
                          {
                            "type": "component",
                            "id": "track-main",
                            "component": {
                              "kind": "container",
                              "rows": [
                                {
                                  "type": "component",
                                  "id": "row-name",
                                  "component": {
                                    "kind": "text",
                                    "primary": { "type": "field", "path": "name" },
                                    "label": { "show": true, "text": "Name" }
                                  }
                                },
                                {
                                  "type": "component",
                                  "id": "row-description",
                                  "component": {
                                    "kind": "text",
                                    "primary": { "type": "field", "path": "description" },
                                    "label": { "show": true, "text": "Description" }
                                  }
                                }
                              ]
                            }
                          },
                          {
                            "type": "component",
                            "id": "track-meta",
                            "component": {
                              "kind": "container",
                              "rows": [
                                {
                                  "type": "component",
                                  "id": "row-status",
                                  "component": {
                                    "kind": "badge",
                                    "primary": { "type": "field", "path": "status" },
                                    "label": { "show": true, "text": "Status" }
                                  }
                                },
                                {
                                  "type": "component",
                                  "id": "row-created",
                                  "component": {
                                    "kind": "date",
                                    "primary": { "type": "field", "path": "createdAt" },
                                    "dateDisplayFormat": "datetime",
                                    "label": { "show": true, "text": "Created" }
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

---

## metricsRowDesigner

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
                    "id": "row-kpi",
                    "component": {
                      "kind": "metric-kpi",
                      "metricDefinitionId": "account_balance",
                      "label": "Total Balance",
                      "groupBindings": {},
                      "dimensionBindings": {
                        "accountId": { "type": "entityField", "fieldPath": "id" }
                      }
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
                                    "entityName": "account",
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
                                      "accountId": {
                                        "type": "entityField",
                                        "fieldPath": "id"
                                      }
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

---

## Minimal skeletons

Use these as starting points; expand `data` per surface.

### list (table only)

```json
{
  "kind": "design-layout-slice",
  "surface": "list",
  "version": 1,
  "data": {
    "listViewType": "table",
    "table": { "fields": ["name"], "showActions": true },
    "expandableTable": {
      "columns": [
        {
          "id": "col-1",
          "label": "Name",
          "cellLayout": {
            "root": {
              "type": "root",
              "id": "root-1",
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
                            "id": "row-1",
                            "component": {
                              "kind": "text",
                              "primary": { "type": "field", "path": "name" }
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
      "rowExpandLayout": {
        "root": {
          "type": "root",
          "id": "root-1",
          "columnCount": 1,
          "columns": [
            {
              "id": "col-1",
              "rows": [
                {
                  "type": "component",
                  "id": "row-container",
                  "component": { "kind": "container", "rows": [] }
                }
              ]
            }
          ]
        }
      },
      "showActions": true
    }
  }
}
```

### forms (plain)

```json
{
  "kind": "design-layout-slice",
  "surface": "forms",
  "version": 1,
  "data": {
    "presentation": "plain",
    "modalSize": "md",
    "layout": {
      "root": {
        "type": "root",
        "id": "root-1",
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
  }
}
```

---

## Related

- [README](../README.md) — surface router and glossary
- [Validation errors](./validation-errors.md) — troubleshooting failed imports
- [SYNC](../SYNC.md) — envelope schema sync with AI context
