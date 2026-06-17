# Item list — expandable table

Grouped columns with per-column `cellLayout` and `rowExpandLayout`.

Set `listViewType: "expandableTable"`. Each column has `cellLayout: UiLayoutDocument`. Columns support `displayFrom`/`displayTo` for responsive column visibility. `rowExpandLayout` uses nested single-column pattern for expanded row content.

## Allowed component kinds
- `text`
- `image`
- `icon`
- `user`
- `metric-kpi`
- `metric-derived-kpi`
- `metric-widget`
- `view-filter`

## Slice envelope example
```json
{
  "kind": "design-layout-slice",
  "surface": "list",
  "version": 1,
  "data": {
    "listViewType": "table",
    "table": {
      "fields": [
        "name"
      ],
      "showActions": true
    },
    "expandableTable": {
      "columns": [
        {
          "id": "col-example",
          "label": "Column",
          "cellLayout": {
            "root": {
              "type": "root",
              "id": "root-example",
              "columnCount": 1,
              "columns": [
                {
                  "id": "col-example",
                  "rows": [
                    {
                      "type": "component",
                      "id": "row-example",
                      "component": {
                        "kind": "container",
                        "rows": [
                          {
                            "type": "nested-layout",
                            "id": "nested-example",
                            "columnCount": 2,
                            "columns": [
                              {
                                "id": "col-example",
                                "rows": [
                                  {
                                    "type": "component",
                                    "id": "row-example",
                                    "component": {
                                      "kind": "text",
                                      "primary": {
                                        "type": "field",
                                        "path": "name"
                                      },
                                      "label": {
                                        "show": true
                                      }
                                    }
                                  }
                                ]
                              },
                              {
                                "id": "col-example",
                                "rows": [
                                  {
                                    "type": "component",
                                    "id": "row-example",
                                    "component": {
                                      "kind": "text",
                                      "primary": {
                                        "type": "field",
                                        "path": "name"
                                      },
                                      "styles": [
                                        {
                                          "property": "fontWeight",
                                          "value": "bold"
                                        }
                                      ]
                                    }
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    }
                  ]
                }
              ]
            },
            "showActions": true,
            "cardsPerRow": 1
          }
        }
      ],
      "rowExpandLayout": {
        "root": {
          "type": "root",
          "id": "root-example",
          "columnCount": 1,
          "columns": [
            {
              "id": "col-example",
              "rows": [
                {
                  "type": "component",
                  "id": "row-example",
                  "component": {
                    "kind": "container",
                    "rows": [
                      {
                        "type": "nested-layout",
                        "id": "nested-example",
                        "columnCount": 2,
                        "columns": [
                          {
                            "id": "col-example",
                            "rows": [
                              {
                                "type": "component",
                                "id": "row-example",
                                "component": {
                                  "kind": "text",
                                  "primary": {
                                    "type": "field",
                                    "path": "name"
                                  },
                                  "label": {
                                    "show": true
                                  }
                                }
                              }
                            ]
                          },
                          {
                            "id": "col-example",
                            "rows": [
                              {
                                "type": "component",
                                "id": "row-example",
                                "component": {
                                  "kind": "text",
                                  "primary": {
                                    "type": "field",
                                    "path": "name"
                                  },
                                  "styles": [
                                    {
                                      "property": "fontWeight",
                                      "value": "bold"
                                    }
                                  ]
                                }
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                }
              ]
            }
          ]
        },
        "showActions": true,
        "cardsPerRow": 1
      },
      "showActions": true
    }
  }
}
```
