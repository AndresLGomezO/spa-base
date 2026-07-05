# Slots and page components

The main entity page composes four **slot components** that map to runtime regions. These are declarative placeholders — the platform injects live toolbar, metrics, and list behavior at render time.

---

## Slot overview

| Kind | Runtime region |
|------|----------------|
| `page-header` | Entity title, breadcrumbs, primary page chrome |
| `page-toolbar` | Actions, create button, view switcher |
| `page-metrics` | KPI / metrics row above the list |
| `page-list` | Primary list or table for the entity |

All four are allowed only on the **mainPage** design surface. Each accepts optional `styles[]`.

---

## Default stack order

The platform default main page layout stacks slots vertically inside the root container:

```
container
├── page-toolbar
├── page-metrics
└── page-list
```

`page-header` is often placed above the toolbar when used. Order in `container.rows[]` determines visual order.

---

## Minimal main page

```json
{
  "root": {
    "type": "root",
    "id": "main-root",
    "columnCount": 1,
    "columns": [
      {
        "id": "col-1",
        "rows": [
          {
            "type": "component",
            "id": "row-container",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-toolbar",
                  "component": { "kind": "page-toolbar" }
                },
                {
                  "type": "component",
                  "id": "row-metrics",
                  "component": { "kind": "page-metrics" }
                },
                {
                  "type": "component",
                  "id": "row-list",
                  "component": { "kind": "page-list" }
                }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

---

## Full page with header

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-header",
      "component": {
        "kind": "page-header",
        "styles": [
          { "property": "paddingBottom", "value": "16" }
        ]
      }
    },
    {
      "type": "component",
      "id": "row-toolbar",
      "component": { "kind": "page-toolbar" }
    },
    {
      "type": "component",
      "id": "row-metrics",
      "component": { "kind": "page-metrics" }
    },
    {
      "type": "component",
      "id": "row-list",
      "component": {
        "kind": "page-list",
        "styles": [
          { "property": "marginTop", "value": "24" }
        ]
      }
    }
  ]
}
```

---

## Two-column main page (screen-root)

Sidebar filters beside the list:

```json
{
  "root": {
    "type": "screen-root",
    "id": "screen-main",
    "gridTemplateColumns": "minmax(0, 1fr) 300px",
    "gap": "24px",
    "rows": [
      {
        "type": "component",
        "id": "track-main",
        "component": {
          "kind": "container",
          "rows": [
            {
              "type": "component",
              "id": "row-header",
              "component": { "kind": "page-header" }
            },
            {
              "type": "component",
              "id": "row-toolbar",
              "component": { "kind": "page-toolbar" }
            },
            {
              "type": "component",
              "id": "row-metrics",
              "component": { "kind": "page-metrics" }
            },
            {
              "type": "component",
              "id": "row-list",
              "component": { "kind": "page-list" }
            }
          ]
        }
      },
      {
        "type": "component",
        "id": "track-sidebar",
        "displayFrom": "md",
        "displayTo": "xl",
        "component": {
          "kind": "container",
          "rows": [
            {
              "type": "component",
              "id": "row-filter",
              "component": {
                "kind": "view-filter",
                "enableSearch": true,
                "enableFilters": true,
                "enableDateFilter": true,
                "dateFilterGranularity": "month",
                "searchPlaceholder": "Search accounts…",
                "filters": [
                  { "entityName": "Account", "fieldName": "status" },
                  { "entityName": "Account", "fieldName": "accountTypeId" }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}
```

---

## page-metrics and metric row layout

The `page-metrics` slot renders the entity's **metric row layout** (`metricRowLayout`) — a separate `UiLayoutDocument` containing `metric-kpi`, `metric-derived-kpi`, or `metric-widget` components.

Design workflow:

1. Configure widgets in the metrics row designer surface.
2. Arrange KPIs in a horizontal `grid` inside `metricRowLayout`.
3. Place `page-metrics` on the main page to show that row.

The slot itself has no metric bindings — it delegates to `metricRowLayout`.

---

## view-filter companion

`view-filter` often accompanies page slots in a sidebar or above the list. It is not a page slot but is commonly co-located:

```json
{
  "kind": "view-filter",
  "enableSearch": true,
  "enableFilters": true,
  "filters": [
    { "entityName": "Invoice", "fieldName": "status" }
  ]
}
```

---

## Slot styling guidelines

| Slot | Typical styles |
|------|----------------|
| `page-header` | Bottom padding, border separation |
| `page-toolbar` | Horizontal spacing via row wrapper margins |
| `page-metrics` | Section margin top/bottom |
| `page-list` | Flex growth, min-height for scroll regions |

Apply framing styles on the **row wrapper** (`row.styles[]`); apply region background on the component `styles[]`.

---

## What not to put in page slots

| Avoid | Reason |
|-------|--------|
| `form-field` on mainPage | Forms belong on form surfaces |
| Raw `text` / `numeric` for list data | List content is driven by list views and `listItem` layout |
| Duplicate `page-list` | One list region per main page |

---

## Persistence key

Main page layout persists as `mainPage` on the entity UI override and inside the `mainPage` design-layout-slice envelope.

---

## Related

- [Metric bindings](./metric-bindings.md) — KPI component configuration
- [Grid and screen-root](../01-layout-tree/grid-and-screen-root.md) — screen-root layout
- [Envelope examples](../appendix/envelope-examples.md) — `mainPage` slice
