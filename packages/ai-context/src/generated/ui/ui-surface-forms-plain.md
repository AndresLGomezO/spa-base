# Forms — plain

Single-page create/edit form layout.

Set `presentation: "plain"`. Use form-field, form-section, form-actions.

## Allowed component kinds
- `form-field`
- `entity-field-selector`
- `form-section`
- `form-actions`

## Slice envelope example
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
        "id": "root-example",
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
      },
      "showActions": true,
      "cardsPerRow": 1
    }
  }
}
```
