# Component: grid

## Purpose

**When to use:** CSS Grid layout primitive. One child row per grid track (column).

**When not to use:** Simple vertical stacking with one column — a `container` is enough.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | Yes |
| `tableColumnCell` | Yes |
| `tableRowExpand` | Yes |
| `mainPage` | Yes |
| `recordDetail` | Yes |
| `formCreate` | Yes |
| `formEdit` | Yes |
| `formPlain` | Yes |
| `formWizardShell` | Yes |
| `formWizardStep` | Yes |
| `formModalFooter` | Yes |
| `metricStrip` | Yes |
| `metricRow` | Yes |
| `metricWidget` | Yes |
| `dashboardSection` | Yes |
| `dashboardLayout` | Yes |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `gridTemplateColumns` | `string` | Yes | Valid CSS grid template (e.g. `1fr 1fr`, `repeat(3, minmax(0, 1fr))`). | Defines column tracks. |
| `gap` | `string` | No | CSS length with unit (e.g. `12px`, `16px`). | Spacing between tracks. |
| `alignItems` | `LayoutAlign` | No | `start` \| `center` \| `end` \| `stretch`. | Cross-axis alignment of tracks. |
| `rows` | `RowNode[]` | Yes | One component row per column track. | Track content. |
| `styles` | `StyleRule[]` | No | Valid style properties. | Grid-level framing. |

## Interactions

None — structural only.

## Binding

None. Track children bind their own data.

## Minimal example

```json
{
  "kind": "grid",
  "gridTemplateColumns": "1fr",
  "rows": []
}
```

## Realistic example

```json
{
  "kind": "grid",
  "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
  "gap": "12px",
  "alignItems": "start",
  "rows": [
    {
      "type": "component",
      "id": "track-primary",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-title",
            "component": {
              "kind": "text",
              "primary": {
                "type": "field",
                "path": "name"
              },
              "label": {
                "show": true,
                "text": "Account"
              }
            }
          },
          {
            "type": "component",
            "id": "row-bank",
            "component": {
              "kind": "text",
              "primary": {
                "type": "field",
                "path": "bank.name"
              },
              "fallbacks": [
                {
                  "type": "static",
                  "value": "—"
                }
              ]
            }
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "track-amount",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-amount",
            "component": {
              "kind": "numeric",
              "primary": {
                "type": "field",
                "path": "balance"
              },
              "displayFormat": "currency",
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
```

## Common mistakes

- Fewer `rows` than `gridTemplateColumns` tracks (empty columns).
- More `rows` than columns without spanning — extra rows wrap unpredictably.
- Omitting `gap` when tracks need visual separation.
