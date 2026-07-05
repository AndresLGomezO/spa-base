# Container and grid tracks

The `container` is the universal content wrapper. The `grid` is the only structural primitive for columns. Together they form every multi-column layout.

---

## Root container rule

At the document root (column `root` scope), the layout must be:

```
root (columnCount: 1)
└── columns[0]
    └── rows[0]  →  kind: "container"  (exactly one)
        └── rows[]  →  user-designed content
```

```json
{
  "root": {
    "type": "root",
    "id": "root-1",
    "columnCount": 1,
    "columns": [
      {
        "id": "col-root",
        "rows": [
          {
            "type": "component",
            "id": "row-root-container",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-name",
                  "component": {
                    "kind": "text",
                    "primary": { "type": "field", "path": "name" },
                    "label": { "show": true }
                  }
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

**Why:** The root container provides a stable insertion point for presets, import normalization, and builder tooling. Never place display components directly under the column.

---

## Container behavior

| Property | Purpose |
|----------|---------|
| `rows[]` | Vertically stacked child rows (components or nested structure) |
| `styles[]` | Padding, background, border on the container shell |

Containers do **not** define columns. For side-by-side content, add a `grid` row inside `container.rows`.

### Stacked form fields

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-name",
      "component": {
        "kind": "form-field",
        "fieldPath": "name"
      }
    },
    {
      "type": "component",
      "id": "row-status",
      "component": {
        "kind": "form-field",
        "fieldPath": "status"
      }
    },
    {
      "type": "component",
      "id": "row-actions",
      "component": { "kind": "form-actions" }
    }
  ]
}
```

---

## Grid tracks: one row per column

A `grid` component defines columns via `gridTemplateColumns`. Each **track** is one entry in `grid.rows[]`.

```
container
└── grid (gridTemplateColumns: "1fr 1fr")
    ├── rows[0] → track 1 (left)
    └── rows[1] → track 2 (right)
```

### Two-track list card (recommended pattern)

Left track: primary text. Right track: badge and numeric emphasis.

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-grid",
      "component": {
        "kind": "grid",
        "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
        "gap": "12px",
        "alignItems": "start",
        "rows": [
          {
            "type": "component",
            "id": "track-left",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-name",
                  "component": {
                    "kind": "text",
                    "primary": { "type": "field", "path": "name" },
                    "label": { "show": true }
                  }
                },
                {
                  "type": "component",
                  "id": "row-subtitle",
                  "component": {
                    "kind": "text",
                    "primary": { "type": "field", "path": "bank.name" },
                    "label": { "show": false }
                  }
                }
              ]
            }
          },
          {
            "type": "component",
            "id": "track-right",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-status",
                  "component": {
                    "kind": "badge",
                    "primary": { "type": "field", "path": "status" },
                    "label": { "show": true, "text": "Status", "position": "above" }
                  }
                },
                {
                  "type": "component",
                  "id": "row-amount",
                  "component": {
                    "kind": "numeric",
                    "primary": { "type": "field", "path": "amount" },
                    "displayFormat": "currency",
                    "styles": [{ "property": "fontWeight", "value": "bold" }]
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
```

---

## Track composition rules

1. **One row per track** — `grid.rows.length` matches the column count implied by `gridTemplateColumns`.
2. **Wrap tracks in containers** — each track row should be a `container` so multiple components stack vertically within the column.
3. **Use `minmax(0, …fr)`** — prevents grid blowout when content has long unbroken strings.
4. **Set `alignItems`** on the grid when tracks should top-align (`start`) vs stretch.
5. **Nest grids** — a track container may contain another `grid` for sub-columns.

### Three-column KPI strip

```json
{
  "kind": "grid",
  "gridTemplateColumns": "repeat(3, minmax(0, 1fr))",
  "gap": "16px",
  "rows": [
    {
      "type": "component",
      "id": "track-kpi-1",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-revenue",
            "component": {
              "kind": "metric-kpi",
              "metricDefinitionId": "total_revenue",
              "label": "Revenue",
              "groupBindings": {},
              "dimensionBindings": {}
            }
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "track-kpi-2",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-cost",
            "component": {
              "kind": "metric-kpi",
              "metricDefinitionId": "total_cost",
              "label": "Cost",
              "groupBindings": {},
              "dimensionBindings": {}
            }
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "track-kpi-3",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-margin",
            "component": {
              "kind": "metric-derived-kpi",
              "label": "Margin",
              "expression": [
                { "type": "metric", "metricDefinitionId": "total_revenue" },
                { "type": "operator", "op": "-" },
                { "type": "metric", "metricDefinitionId": "total_cost" }
              ],
              "groupBindings": {},
              "dimensionBindings": {}
            }
          }
        ]
      }
    }
  ]
}
```

---

## Common `gridTemplateColumns` values

| Pattern | Value |
|---------|-------|
| Equal two columns | `"1fr 1fr"` |
| Main + sidebar | `"minmax(0, 2fr) minmax(0, 1fr)"` |
| Fixed sidebar | `"minmax(0, 1fr) 280px"` |
| Three equal | `"repeat(3, minmax(0, 1fr))"` |
| Auto-fit cards | `"repeat(auto-fit, minmax(200px, 1fr))"` |

---

## Screen-root tracks

On `screen-root`, tracks are top-level `rows[]` instead of living inside a root container. The same one-row-per-track rule applies:

```json
{
  "type": "screen-root",
  "id": "screen-dashboard",
  "gridTemplateColumns": "1fr 320px",
  "gap": "24px",
  "rows": [
    {
      "type": "component",
      "id": "track-main",
      "component": {
        "kind": "container",
        "rows": [
          { "type": "component", "id": "row-metrics", "component": { "kind": "page-metrics" } },
          { "type": "component", "id": "row-list", "component": { "kind": "page-list" } }
        ]
      }
    },
    {
      "type": "component",
      "id": "track-filters",
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
              "filters": [
                { "entityName": "Account", "fieldName": "status" }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

---

## Checklist

- [ ] Exactly one `container` at column root
- [ ] Multi-column sections use `grid`, not multiple root columns
- [ ] Each grid track is one `rows[]` entry
- [ ] Track content wrapped in `container` for vertical stacks
- [ ] `gridTemplateColumns` uses `minmax(0, …)` for flexible tracks
