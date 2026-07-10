# Metrics row

Metric widgets row above entity list.

Requires `metricWidgets[]` definitions and `metricRowLayout` with metric-widget refs.

## Allowed component kinds
- `text`
- `image`
- `icon`
- `date`
- `numeric`
- `badge`
- `chart`
- `metric-kpi`
- `metric-derived-kpi`
- `view-search`
- `view-filters`
- `view-date-filter`
- `metric-widget`

## Slice envelope example
```json
{
  "kind": "design-layout-slice",
  "surface": "metricsRowDesigner",
  "version": 1,
  "data": {
    "metricWidgets": [],
    "metricRowLayout": {
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
}
```
