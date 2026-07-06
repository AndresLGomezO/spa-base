# Item list — card

Card grid using `listItem` UiLayoutDocument per record.

Set `listViewType: "card"`. Default preset: `card-list`. Layout uses display components only. Prefer root → container → grid with two tracks (see `ui.layout.base` card pattern).

## Allowed component kinds
- `text`
- `image`
- `icon`
- `user`
- `chart`
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
    "listViewType": "card",
    "table": {
      "fields": [
        "name",
        "status",
        "amount"
      ],
      "showActions": true
    },
    "listItem": {
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
                        "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
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
                                    "kind": "text",
                                    "primary": {
                                      "type": "field",
                                      "path": "name"
                                    },
                                    "label": {
                                      "show": true
                                    }
                                  }
                                },
                                {
                                  "type": "component",
                                  "id": "row-example",
                                  "component": {
                                    "kind": "text",
                                    "primary": {
                                      "type": "field",
                                      "path": "status"
                                    },
                                    "label": {
                                      "show": true
                                    }
                                  }
                                },
                                {
                                  "type": "component",
                                  "id": "row-example",
                                  "component": {
                                    "kind": "text",
                                    "primary": {
                                      "type": "field",
                                      "path": "amount"
                                    },
                                    "label": {
                                      "show": true
                                    }
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
                            "type": "component",
                            "id": "row-example",
                            "component": {
                              "kind": "grid",
                              "gridTemplateColumns": "repeat(2, 1fr)",
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
                        "type": "component",
                        "id": "row-example",
                        "component": {
                          "kind": "grid",
                          "gridTemplateColumns": "repeat(2, 1fr)",
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
      "showActions": true
    }
  }
}
```
