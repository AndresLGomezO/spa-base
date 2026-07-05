# List views

Entity lists support three primary presentations: **table**, **card**, and **expandableTable**. All three share the same `design-layout-slice` envelope surface (`list`) but differ in which `data` fields drive runtime behavior.

`listViewType` selects the active presentation. The platform default presets map as follows:

| `listViewType` | Preset | Layout surface |
|----------------|--------|------------------|
| `table` | `plain-table-list` | `listItem` (cell content per column) |
| `card` | `card-list` | `listItem` (card body) |
| `expandableTable` | `expandable-table-list` | `tableColumnCell` + `tableRowExpand` |

`compact` is an alias for `expandableTable`.

---

## Shared envelope shape

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

| Field | Required | Description |
|-------|----------|-------------|
| `listViewType` | Yes | `table` \| `card` \| `expandableTable` \| `compact` |
| `table` | Yes | Column field paths and actions flag |
| `expandableTable` | Yes | Grouped columns and row expand layout (required structurally) |
| `listItem` | Card only | Card layout document |

`table.fields` is required even for card and expandable presentations — it drives column metadata and default field selection.

---

## Table list

A table list renders one text component per field inside the list item cell. Use preset `plain-table-list` as the starting point.

```json
{
  "kind": "design-layout-slice",
  "surface": "list",
  "version": 1,
  "data": {
    "listViewType": "table",
    "table": {
      "fields": ["name", "status", "amount", "createdAt"],
      "showActions": true
    },
    "expandableTable": {
      "columns": [
        {
          "id": "col-name",
          "label": "Name",
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
                              "primary": { "type": "field", "path": "name" },
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

**Design notes:**

- Table columns map to `table.fields` — each field renders as a labeled `text` row in the cell layout.
- `showActions` controls the row actions column (view, edit, share, delete).
- `expandableTable` must be present structurally even when `listViewType` is `table`.

---

## Card list

Card lists use a two-track grid inside each list item. Preset `card-list` sets `listViewType: "card"`, `showActions: true`, and a `minmax(0, 2fr) minmax(0, 1fr)` grid.

```json
{
  "kind": "design-layout-slice",
  "surface": "list",
  "version": 1,
  "data": {
    "listViewType": "card",
    "table": {
      "fields": ["name", "status", "amount"],
      "showActions": true
    },
    "expandableTable": {
      "columns": [
        {
          "id": "col-name",
          "label": "Name",
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
                  "component": { "kind": "container", "rows": [] }
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
                                },
                                {
                                  "type": "component",
                                  "id": "row-amount",
                                  "component": {
                                    "kind": "numeric",
                                    "primary": { "type": "field", "path": "amount" },
                                    "displayFormat": "currency",
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

**Design notes:**

- `listItem` is required when `listViewType` is `card`.
- Primary content belongs in the left track; status, actions, or emphasis fields in the right track.
- Set `showActions: true` on the layout document to surface row-level actions on the card.

---

## Expandable table

Expandable tables render custom cell layouts per column and a row expand panel. Preset `expandable-table-list` seeds the expand panel; column `cellLayout` documents are authored per column.

```json
{
  "kind": "design-layout-slice",
  "surface": "list",
  "version": 1,
  "data": {
    "listViewType": "expandableTable",
    "table": {
      "fields": ["name", "amount", "status"],
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
                              "primary": { "type": "field", "path": "name" },
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
                              "displayFormat": "currency",
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
                        "id": "row-grid",
                        "component": {
                          "kind": "grid",
                          "gridTemplateColumns": "1fr 1fr",
                          "gap": "16px",
                          "rows": [
                            {
                              "type": "component",
                              "id": "track-detail",
                              "component": {
                                "kind": "container",
                                "rows": [
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
      },
      "showActions": true
    }
  }
}
```

**Design notes:**

- Each column requires a unique `id` and a `cellLayout` document (surface: `tableColumnCell`).
- `displayFrom` / `displayTo` control responsive column visibility (`base`, `sm`, `md`, `lg`, `xl`).
- `rowExpandLayout` is the expand panel (surface: `tableRowExpand`). Use a grid for side-by-side detail content.

---

## Presentation checklist

- [ ] `listViewType` matches the intended runtime presentation
- [ ] `table.fields` lists every visible column field path
- [ ] Card presentation includes `listItem` with `showActions` when actions are needed
- [ ] Expandable columns each have a `cellLayout` with container-root structure
- [ ] Row expand panel uses grid tracks for multi-column detail layout
- [ ] Display field paths use relation labels (`bank.name`); not form FK paths

---

## Related

- [Design surfaces matrix](./design-surfaces-matrix.md) — `listItem`, `tableColumnCell`, `tableRowExpand`
- [Platform presets](../06-presets/platform-presets.md) — `plain-table-list`, `card-list`, `expandable-table-list`
- [Entity UI overrides](../05-persistence/entity-ui-overrides.md) — persistence keys
- [Responsive visibility](../01-layout-tree/responsive-visibility.md) — column `displayFrom` / `displayTo`
