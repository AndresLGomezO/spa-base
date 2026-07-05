# Component: container

## Purpose

**When to use:** Stack child rows vertically inside a track. Neutral wrapper with no intrinsic styling.

**When not to use:** Multi-column layout — use `grid` instead. Nesting many empty containers adds noise.

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

Structural kinds are universal (`isComponentKindAllowedOnSurface` returns true on every surface).

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `rows` | `RowNode[]` | Yes | Child layout rows. Prefer nesting a `grid` for columns. | Holds designed content. |
| `stackDirection` | `column` \| `row` | No | Deprecated. Use `grid` for directional layout. | Legacy horizontal stacks. |
| `styles` | `StyleRule[]` | No | Valid style properties only. | Padding, background, borders. |

## Interactions

None — structural only.

## Binding

None. Children bind their own data.

## Minimal example

```json
{
  "kind": "container",
  "rows": []
}
```

## Realistic example

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-grid",
      "component": {
        "kind": "grid",
        "gridTemplateColumns": "1fr 1fr",
        "gap": "16px",
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
                    "primary": {
                      "type": "field",
                      "path": "name"
                    }
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
                    "primary": {
                      "type": "field",
                      "path": "status"
                    }
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

## Common mistakes

- Putting multiple columns directly in `container.rows` without a `grid`.
- Placing content components directly under a column `root` — wrap in `container` first.
- Using `stackDirection` for new layouts instead of `grid`.
