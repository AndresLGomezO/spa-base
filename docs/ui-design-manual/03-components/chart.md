---
aiContextFragmentId: ui.components.chart
title: Chart component
surfaces: [listItem, recordDetail, formPlain, metricRow, metricWidget, dashboardLayout, dashboardSection]
---

## Purpose

The `chart` component is a **reference** to a tenant-registered chart definition (`chartDefinitionId`). Recipe fields (type, data source, series, axes, legend, grid, animation) live in **Settings → Charts**; layout instances may override `parameterBindings`, overlay `styles`, and `ariaLabel`.

Charts fill their container (`width/height: 100%`, no internal padding). Use overlay positioning styles (`pointerEvents: none`, inset `top`/`bottom`, etc.) for decorative background charts behind KPI text.

## Key props (layout instance)

| Prop | Description |
|------|-------------|
| `chartDefinitionId` | Document id, `chartId` slug, or display name of a chart definition |
| `parameterBindings` | Optional per-instance query/metric parameter overrides |
| `styles` | Overlay positioning and sizing (especially for metric-widget cards) |
| `ariaLabel` | Optional accessible name override |

Chart definitions (Settings → Charts) hold `chartType`, `displayMode`, `dataSource`, `series`, axes, legend, grid, and animation.

## Charts workbench

Register and edit chart recipes at **Settings → Analytics → Charts** (`/settings/charts`). The workbench provides a metrics-style list (search, filters, sort), a recipe editor, live preview, and a collapsible data inspector (source config + rendered series JSON).

Import/export uses portable JSON envelopes (`chart-definition`, `chart-definitions-catalog`).

## Metric-series overlay recipe

Use when the chart must match a **computed** or aggregated metric exactly (e.g. net balance). Each bucket resolves a month label via `relativePeriod` and reads the metric through `/evaluate` (computed) or `/batch` (aggregated).

- Set `dimensionField` to the metric's sliding date parameter (`period` for computed net balance) or dimension field (`date` for aggregated monthly metrics).
- Bind anchor month with `parameterBindings.period` → `dashboardDateFilter` (computed) or `dimensionBindings.date` → `dashboardDateFilter` (aggregated).

Example — net balance (matches KPI evaluate path):

```json
{
  "name": "Total balance trend chart",
  "chartType": "area",
  "displayMode": "overlay",
  "dataSource": {
    "type": "metricSeries",
    "metricDefinitionId": "Net Balance by Month",
    "dimensionField": "period",
    "bucketCount": 12,
    "step": { "unit": "month", "offsetStart": -11, "offsetEnd": 0 },
    "parameterBindings": {
      "period": { "type": "dashboardDateFilter" }
    }
  }
}
```

Per-bucket `relativePeriod` offsets are applied at runtime from `dimensionField` and `step`.

## Entity-query time series overlay recipe

Use one **parametric windowed** saved query (e.g. `Transaction trend`) with `period` (date window) and `types` (`stringList` bound via `parameterBindings`). Multiple charts on the same page share **one cached row fetch** when query + bindings match; each chart applies its own `timeSeries.rowFilters` client-side.

### Month-to-date widget overlay (`layout: "monthToDateRightAligned"`)

For metric-widget decorative charts, prefer **30 daily buckets** filled from the **right**. When the dashboard month is the **current calendar month**, slots fill through **today**. For **past months**, the full month is shown (last day of that month on the right). **Future months** stay all zero.

- Set `bucketCount: 30`, `layout: "monthToDateRightAligned"`, `step.unit: "day"`.
- Fetch scope stays one month (`relativePeriod` offset `0`, unit `month`); bucketing uses day granularity client-side.
- Net balance overlay: `rowFilters` + expense `valueTransforms` with `multiplier: -1` (same parity as monthly net).

Example — income widget MTD:

```json
"timeSeries": {
  "periodParameter": "period",
  "bucketCount": 30,
  "layout": "monthToDateRightAligned",
  "step": { "unit": "day", "offsetStart": 0, "offsetEnd": 0 },
  "aggregate": "sum",
  "rowFilters": [
    { "whenField": "type", "whenOperator": "==", "whenValue": "INCOME" }
  ]
}
```

### Span layout (historical trend)

Use `layout: "span"` (default) for multi-month relative offsets (e.g. 12 monthly buckets with `offsetStart: -11`, `offsetEnd: 0`).

1. Create a chart definition in **Settings → Charts** (e.g. `Income trend chart`) with overlay display mode and the entity-query time series recipe below.
2. In the UI Builder, add a **Chart** component and select that definition.
3. Set instance `parameterBindings.types` if the layout needs a shared type list across widgets.
4. Hide legend and axes in the definition; place the chart row last with overlay styles (`pointerEvents: none`, `top: 50%`, `bottom: 0`, …).
5. Set per-widget `series[]` tint colors in the definition (white / green / red / indigo).

Layout instance (income widget):

```json
{
  "kind": "chart",
  "chartDefinitionId": "Income trend chart",
  "parameterBindings": {
    "types": {
      "type": "static",
      "value": ["INCOME", "EXPENSE", "PAYMENT", "INVESTMENT"]
    }
  },
  "styles": [
    { "property": "width", "value": "100%" },
    { "property": "top", "value": "50%" },
    { "property": "right", "value": "0" },
    { "property": "bottom", "value": "0" },
    { "property": "left", "value": "0" },
    { "property": "pointerEvents", "value": "none" },
    { "property": "zIndex", "value": "0" }
  ]
}
```

Definition recipe body (stored in chart catalog — income example):

```json
{
  "name": "Income trend chart",
  "chartType": "area",
  "displayMode": "overlay",
  "dataSource": {
    "type": "entityQuery",
    "entityQueryDefinitionId": "Transaction trend",
    "xFieldPath": "date",
    "yFieldPath": "amount",
    "parameterBindings": {
      "types": {
        "type": "static",
        "value": ["INCOME", "EXPENSE", "PAYMENT", "INVESTMENT"]
      }
    },
    "timeSeries": {
      "periodParameter": "period",
      "bucketCount": 30,
      "layout": "monthToDateRightAligned",
      "step": { "unit": "day", "offsetStart": 0, "offsetEnd": 0 },
      "aggregate": "sum",
      "rowFilters": [
        { "whenField": "type", "whenOperator": "==", "whenValue": "INCOME" }
      ]
    }
  }
}
```

Parametric query definition (`Transaction trend`):
  "sourceEntity": "transaction",
  "parameters": [
    { "name": "period", "valueType": "dateBucket", "granularity": "month", "field": "date" },
    { "name": "types", "valueType": "stringList", "field": "type" }
  ],
  "filter": {
    "type": "group",
    "combinator": "and",
    "children": [
      {
        "field": "date",
        "operator": ">=",
        "value": {
          "type": "parameter",
          "name": "period",
          "bound": "start",
          "offset": -11,
          "unit": "month"
        }
      },
      {
        "field": "date",
        "operator": "<=",
        "value": { "type": "parameter", "name": "period", "bound": "end" }
      },
      {
        "field": "type",
        "operator": "in",
        "value": { "type": "parameter", "name": "types" }
      }
    ]
  },
  "limitMode": "all"
}
```

Query definition names resolve to Firestore ids at runtime (same pattern as metric definition names).

Tenant widget layouts and chart bindings belong in tenant seed catalogs (e.g. `apps/api/src/admin/<tenant>/catalogs/`), not in `apps/web`.

## Static sample

```json
{
  "kind": "chart",
  "chartType": "line",
  "dataSource": {
    "type": "static",
    "points": [
      { "x": "Jan", "y": 12 },
      { "x": "Feb", "y": 18 }
    ]
  }
}
```

## Related

- [Total Balance card recipe](../07-recipes/total-balance-card.md)
- [Metric bindings](../02-data-binding/metric-bindings.md)
