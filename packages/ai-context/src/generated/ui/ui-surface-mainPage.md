# Main view

Entity main page slots: header, toolbar, metrics, list.

Stored as `mainPage` on entity UI override. Slot kinds: page-header, page-toolbar, page-metrics, page-list.

## Allowed component kinds
- `page-header`
- `page-toolbar`
- `page-metrics`
- `page-list`
- `view-search`
- `view-filter`

## Slice envelope example
```json
{
  "kind": "design-layout-slice",
  "surface": "mainPage",
  "version": 1,
  "data": {
    "mainPage": {
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
}
```
