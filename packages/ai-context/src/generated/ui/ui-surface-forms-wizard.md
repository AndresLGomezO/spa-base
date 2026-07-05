# Forms — wizard

Multi-step wizard with shell + step layouts.

Set `presentation: "wizard"`. Default preset: `wizard-form`. Shell: wizard-progress, wizard-step-host, wizard-actions. Steps: form-field, form-section.

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
    "presentation": "wizard",
    "modalSize": "md",
    "wizard": {
      "shellLayout": {
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
                        "type": "component",
                        "id": "row-example",
                        "component": {
                          "kind": "grid",
                          "gridTemplateColumns": "minmax(0, 1fr) minmax(0, 2fr)",
                          "rows": [
                            {
                              "type": "component",
                              "id": "row-example",
                              "component": {
                                "kind": "container",
                                "rows": [
                                  {
                                    "type": "component",
                                    "id": "row-example",
                                    "component": {
                                      "kind": "wizard-progress",
                                      "variant": "bar",
                                      "stepLabel": {
                                        "show": true,
                                        "position": "top",
                                        "bold": true
                                      },
                                      "conditionalStyles": []
                                    }
                                  }
                                ]
                              }
                            },
                            {
                              "type": "component",
                              "id": "row-example",
                              "component": {
                                "kind": "container",
                                "rows": [
                                  {
                                    "type": "component",
                                    "id": "row-example",
                                    "component": {
                                      "kind": "wizard-step-host"
                                    }
                                  },
                                  {
                                    "type": "component",
                                    "id": "row-example",
                                    "component": {
                                      "kind": "wizard-actions"
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
        },
        "showActions": true,
        "cardsPerRow": 1
      },
      "steps": [
        {
          "id": "step-example",
          "label": "Step 1",
          "layout": {
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
                            "type": "component",
                            "id": "row-example",
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
            },
            "showActions": true,
            "cardsPerRow": 1
          }
        }
      ]
    }
  }
}
```
