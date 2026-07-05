---
aiContextFragmentId: ui.recipes.card-list-with-badge
title: Card list with badge and amount
surfaces: [list]
---

## Goal

Build a **card list** where each row shows primary text on the left and a **status badge** plus **currency amount** on the right. Use a two-track `grid` inside the `listItem` layout — never multiple root columns.

## When to use

- Entity lists where status and a numeric value matter at a glance (invoices, accounts, orders).
- Card presentation (`listViewType: "card"`) with optional row actions.

## Step-by-step

1. **Set list presentation** — `listViewType: "card"`. Keep `table.fields` populated even for card view; it drives column metadata and filters.
2. **Start the listItem root** — column `root` with `columnCount: 1` and exactly one `container` row under `columns[0].rows`.
3. **Add a two-track grid** — inside the root container, add one `grid` row with `gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)"` and `gap: "12px"`.
4. **Left track (primary)** — wrap track 1 in a `container`. Stack `text` for `name` (label on) and a subtitle `text` for a relation path like `bank.name` (label off).
5. **Right track (emphasis)** — wrap track 2 in a `container`. Stack `badge` for `status` (label above) then `numeric` for `amount` with `displayFormat: "currency"` and bold weight.
6. **Enable actions** — set `listItem.showActions: true` when the list should expose row actions.
7. **Validate paths** — display components use relation dot paths (`bank.name`); never FK ids (`bankId`) on list surfaces.

## Layout sketch

```
listItem.root
└── container
    └── grid (2fr | 1fr)
        ├── track-left → container
        │   ├── text (name)
        │   └── text (bank.name)
        └── track-right → container
            ├── badge (status)
            └── numeric (amount, currency)
```

## Full envelope example

```json
{
  "kind": "design-layout-slice",
  "surface": "list",
  "version": 1,
  "data": {
    "listViewType": "card",
    "table": {
      "fields": ["name", "bank.name", "status", "amount", "dueDate"],
      "showActions": true
    },
    "expandableTable": {
      "columns": [
        {
          "id": "col-name",
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
                        "alignItems": "start",
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
                                  "id": "row-bank",
                                  "component": {
                                    "kind": "text",
                                    "primary": { "type": "field", "path": "bank.name" },
                                    "label": { "show": false },
                                    "styles": [
                                      { "property": "color", "value": "muted" },
                                      { "property": "fontSize", "value": "var(--text-body)" }
                                    ]
                                  }
                                },
                                {
                                  "type": "component",
                                  "id": "row-due",
                                  "component": {
                                    "kind": "date",
                                    "primary": { "type": "field", "path": "dueDate" },
                                    "dateDisplayFormat": "date",
                                    "label": { "show": true, "text": "Due", "position": "above" }
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
                                    "primary": { "type": "field", "path": "status" },
                                    "label": { "show": true, "text": "Status", "position": "above" }
                                  }
                                },
                                {
                                  "type": "component",
                                  "id": "row-amount",
                                  "component": {
                                    "kind": "numeric",
                                    "primary": { "type": "field", "path": "amount" },
                                    "displayFormat": "currency",
                                    "label": { "show": false },
                                    "styles": [
                                      { "property": "fontWeight", "value": "bold" },
                                      { "property": "textAlign", "value": "right" }
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

## Checklist

- [ ] `listViewType` is `"card"` and `listItem` is present
- [ ] Root has exactly one `container`; multi-column content uses `grid`
- [ ] `grid.rows.length` matches the two tracks in `gridTemplateColumns`
- [ ] Each track is a `container` wrapping vertically stacked components
- [ ] `gridTemplateColumns` uses `minmax(0, …fr)` to prevent overflow blowout
- [ ] Badge and numeric sit in the right track; primary text in the left track

## Related

- [Container and grid tracks](../01-layout-tree/container-and-tracks.md) — two-track list card pattern
- [Data sources](../02-data-binding/data-sources.md) — field binding and fallbacks
- [Envelope examples](../appendix/envelope-examples.md) — `list` surface shape
