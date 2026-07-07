# Component: chart

Line or area chart with static points, metric time series, or entity query rows. Use displayMode overlay for decorative background charts behind KPI text.

**Properties:** chartType: line | area, displayMode?: inline | overlay, dataSource, series?, legend?, xAxis?, yAxis?, grid?, animation?, styles?

```json
{
  "kind": "chart",
  "chartType": "area",
  "displayMode": "overlay",
  "dataSource": {
    "type": "metricSeries",
    "metricDefinitionId": "Total Balance by Month",
    "dimensionField": "date",
    "bucketCount": 12,
    "step": {
      "unit": "month",
      "offsetStart": -11,
      "offsetEnd": 0
    },
    "dimensionBindings": {}
  },
  "series": [
    {
      "id": "default",
      "label": "Total Balance",
      "color": "rgba(255, 255, 255, 0.95)",
      "showAreaFill": true,
      "areaFillOpacity": 0.18,
      "strokeWidth": 2
    }
  ],
  "legend": {
    "visible": false,
    "position": "none"
  },
  "xAxis": {
    "visible": false,
    "showTicks": false
  },
  "yAxis": {
    "visible": false,
    "showTicks": false
  },
  "grid": {
    "visible": false
  },
  "animation": {
    "enabled": true,
    "durationMs": 600
  },
  "styles": [
    {
      "property": "width",
      "value": "100%"
    },
    {
      "property": "marginBottom",
      "value": "-110"
    }
  ]
}
```
