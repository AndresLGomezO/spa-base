# Item list — table

Flat column table. Field paths in `views[].fields` (not layout tree).

Set `listViewType: "table"`. Columns are field path strings. Optional `showActions`.

## Allowed component kinds
- `text`
- `image`
- `icon`
- `user`
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
