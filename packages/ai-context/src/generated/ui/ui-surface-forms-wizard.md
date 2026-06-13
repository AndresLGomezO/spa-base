# Forms — wizard

Multi-step wizard with shell + step layouts.

Set `presentation: "wizard"`. Shell: wizard-progress, wizard-step-host, wizard-actions. Steps: form-field, form-section.

## Allowed component kinds
- `wizard-progress`
- `wizard-step-host`
- `wizard-actions`
- `text`
- `image`
- `icon`
- `date`
- `numeric`
- `badge`

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
