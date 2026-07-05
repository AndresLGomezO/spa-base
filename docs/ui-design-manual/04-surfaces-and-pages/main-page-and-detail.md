# Main page and record detail

The **main page** composes the entity list experience through slot components. **Record detail** is a separate screen layout for viewing a single record. Both persist on `entity_ui_overrides` and have dedicated `design-layout-slice` envelope surfaces.

---

## Main page

Surface: `mainPage` (screen scope).

### Slot components

| Kind | Runtime region |
|------|----------------|
| `page-header` | Entity title, breadcrumbs, primary page chrome |
| `page-toolbar` | Actions, create button, view switcher |
| `page-metrics` | KPI / metrics row above the list |
| `page-list` | Primary list or table |

All four slots accept optional `styles[]`. Order in `container.rows[]` determines visual stacking.

### Default stack

The platform default omits `page-header` and stacks toolbar → metrics → list:

```
container
├── page-toolbar
├── page-metrics
└── page-list
```

### Envelope

```json
{
  "kind": "design-layout-slice",
  "surface": "mainPage",
  "version": 1,
  "data": {
    "mainPage": {
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
              }
            ]
          }
        ]
      }
    }
  }
}
```

### Two-column main page with screen-root

For sidebar layouts, use `screen-root` with grid tracks:

```json
{
  "root": {
    "type": "screen-root",
    "id": "screen-main",
    "gridTemplateColumns": "minmax(0, 1fr) minmax(280px, 320px)",
    "gap": "24px",
    "alignItems": "start",
    "rows": [
      {
        "type": "component",
        "id": "track-main",
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
              "id": "row-list",
              "component": { "kind": "page-list" }
            }
          ]
        }
      },
      {
        "type": "component",
        "id": "track-sidebar",
        "component": {
          "kind": "container",
          "rows": [
            {
              "type": "component",
              "id": "row-filters",
              "component": {
                "kind": "view-filter",
                "enableSearch": false,
                "enableFilters": true,
                "filters": [{ "entityName": "account", "fieldName": "status" }]
              }
            }
          ]
        }
      }
    ]
  }
}
```

**Design notes:**

- Slots are declarative placeholders — the platform injects live toolbar, metrics, and list behavior at render time.
- `page-metrics` renders the entity `metricRowLayout` when configured.
- `view-filter` is allowed on `mainPage` for sidebar filter panels.

---

## Record detail

Surface: `recordDetail` (screen scope).

Allowed kinds: display components (`text`, `image`, `icon`, `date`, `numeric`, `badge`, `metric-kpi`, `metric-derived-kpi`, `view-filter`), plus `related-records`.

### Envelope

```json
{
  "kind": "design-layout-slice",
  "surface": "recordDetail",
  "version": 1,
  "data": {
    "recordDetail": {
      "root": {
        "type": "root",
        "id": "detail-root",
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
                      "id": "row-grid",
                      "component": {
                        "kind": "grid",
                        "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
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
                                  "id": "row-name",
                                  "component": {
                                    "kind": "text",
                                    "primary": { "type": "field", "path": "name" },
                                    "label": { "show": true, "text": "Name" }
                                  }
                                },
                                {
                                  "type": "component",
                                  "id": "row-description",
                                  "component": {
                                    "kind": "text",
                                    "primary": { "type": "field", "path": "description" },
                                    "label": { "show": true, "text": "Description" }
                                  }
                                }
                              ]
                            }
                          },
                          {
                            "type": "component",
                            "id": "track-meta",
                            "component": {
                              "kind": "container",
                              "rows": [
                                {
                                  "type": "component",
                                  "id": "row-status",
                                  "component": {
                                    "kind": "badge",
                                    "primary": { "type": "field", "path": "status" },
                                    "label": { "show": true, "text": "Status" }
                                  }
                                },
                                {
                                  "type": "component",
                                  "id": "row-created",
                                  "component": {
                                    "kind": "date",
                                    "primary": { "type": "field", "path": "createdAt" },
                                    "dateDisplayFormat": "datetime",
                                    "label": { "show": true, "text": "Created" }
                                  }
                                },
                                {
                                  "type": "component",
                                  "id": "row-related",
                                  "component": {
                                    "kind": "related-records",
                                    "childEntity": "invoice",
                                    "foreignKeyField": "accountId"
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
      }
    }
  }
}
```

**Design notes:**

- Display bindings use `primary: { "type": "field", "path": "…" }` with relation labels (`bank.name`).
- `related-records` surfaces a child relation list inline in the detail panel.
- Use a two-track grid for primary content (left) and metadata / relations (right).

---

## Persistence mapping

| Concept | Domain key | Firestore JSON field |
|---------|------------|----------------------|
| Main page layout | `mainPage` | `mainPageLayoutJson` |
| Record detail layout | `recordDetail` | `recordDetailLayoutJson` |

The deprecated `detail` key is a read-only alias for `recordDetail` during migration.

---

## Design checklist

- [ ] Main page includes `page-list` — required for the list region
- [ ] Slot order reflects intended visual hierarchy
- [ ] Detail layout uses display DataSource paths, not form `fieldPath`
- [ ] Two-column layouts use grid tracks with container wrappers
- [ ] `related-records` references a valid relation field on the entity

---

## Related

- [Slots and page components](../02-data-binding/slots-and-page-components.md) — slot behavior detail
- [Data sources](../02-data-binding/data-sources.md) — display field binding
- [Design surfaces matrix](./design-surfaces-matrix.md) — `mainPage`, `recordDetail`
- [Entity UI overrides](../05-persistence/entity-ui-overrides.md) — persistence keys
