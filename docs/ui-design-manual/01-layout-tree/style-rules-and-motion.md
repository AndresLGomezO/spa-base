# Style rules and motion

Visual styling is declarative: arrays of `StyleRule` objects attached at specific layout layers. Motion uses `MotionPreset` objects on rows or the document root.

---

## StyleRule format

Each rule is a property/value pair:

```json
{ "property": "backgroundColor", "value": "primary" }
```

| Field | Type | Description |
|-------|------|-------------|
| `property` | string | Style property key (see [Style property reference](../appendix/style-property-reference.md)) |
| `value` | string | ThemeToken, shadow token, CSS variable, or literal CSS value |

### Example array

```json
"styles": [
  { "property": "backgroundColor", "value": "primary" },
  { "property": "boxShadow", "value": "card" },
  { "property": "color", "value": "var(--color-foreground)" },
  { "property": "padding", "value": "var(--spacing-macro)" },
  { "property": "borderRadius", "value": "var(--radius-lg)" },
  { "property": "fontFamily", "value": "var(--font-sans)" }
]
```

---

## Where to attach styles

Styles apply at three layers. Choose the layer that matches the visual intent.

| Layer | JSON path | Best for |
|-------|-----------|----------|
| **Component styles** | `component.styles[]` | Typography, colors, padding on the value; flex self-alignment |
| **Row wrapper styles** | `row.styles[]` on `type: "component"` rows | Margins, outer background, border around the component |
| **Container / grid styles** | `component.styles[]` on `container` or `grid` | Shell padding, track background, grid gap overrides |

### Row wrapper vs component

```json
{
  "type": "component",
  "id": "row_amount",
  "styles": [
    { "property": "marginBottom", "value": "12" },
    { "property": "padding", "value": "8px" }
  ],
  "component": {
    "kind": "numeric",
    "primary": { "type": "field", "path": "amount" },
    "displayFormat": "currency",
    "styles": [
      { "property": "fontWeight", "value": "bold" },
      { "property": "color", "value": "primary" }
    ]
  }
}
```

**Guideline:** row styles = spacing and framing; component styles = how the value looks.

### Grid track styling

Apply shell styles on the `grid` or track `container`:

```json
{
  "kind": "grid",
  "gridTemplateColumns": "1fr 1fr",
  "gap": "16px",
  "styles": [
    { "property": "padding", "value": "var(--spacing-macro)" },
    { "property": "backgroundColor", "value": "muted" },
    { "property": "borderRadius", "value": "var(--radius-lg)" }
  ],
  "rows": []
}
```

### Screen-root styles

`screen-root.styles[]` applies to the top-level grid shell.

---

## ThemeToken values (colors)

For `backgroundColor`, `color`, and `borderColor`, prefer closed ThemeToken values:

`default` | `muted` | `primary` | `success` | `warning` | `danger` | `info` | `background` | `foreground` | `transparent`

```json
{ "property": "backgroundColor", "value": "success" }
```

Custom values: hex (`#rrggbb`), `var(--color-*)`, or tenant custom tokens.

---

## Shadow token

For `boxShadow`:

| Value | Maps to |
|-------|---------|
| `none` | No shadow |
| `card` | Platform card elevation (`var(--shadow-card)`) |

---

## Layout vs style separation

| Layout concern | Use |
|----------------|-----|
| Column count | `grid.gridTemplateColumns` |
| Track spacing | `grid.gap` |
| Vertical stack | `container.rows[]` |
| Track alignment | `grid.alignItems` |
| Responsive show/hide | `displayFrom` / `displayTo` on rows |

Do **not** simulate columns with `width` percentages on components. Insert a `grid`.

---

## Motion presets

`MotionPreset` animates component rows and document-level effects.

### Row-level motion

Attach `motion` on a component row:

```json
{
  "type": "component",
  "id": "row_name",
  "motion": {
    "entrance": "fade",
    "durationMs": 300,
    "delayMs": 0,
    "staggerIndex": true,
    "hoverSurface": "default",
    "hoverTransform": "lift",
    "hoverDurationMs": 150,
    "transition": "layout"
  },
  "component": {
    "kind": "text",
    "primary": { "type": "field", "path": "name" },
    "label": { "show": true }
  }
}
```

### Document-level motion

Attach `motion` on the `UiLayoutDocument` root for layout-wide entrance effects:

```json
{
  "motion": { "entrance": "slide-up", "durationMs": 400 },
  "root": {
    "type": "root",
    "id": "root-1",
    "columnCount": 1,
    "columns": [
      {
        "id": "col-1",
        "rows": [
          {
            "type": "component",
            "id": "row-container",
            "component": { "kind": "container", "rows": [] }
          }
        ]
      }
    ]
  }
}
```

### MotionPreset fields

| Field | Type | Allowed values |
|-------|------|----------------|
| `entrance` | string | `none` \| `fade` \| `slide-up` \| `scale` |
| `durationMs` | number | 0–2000 |
| `delayMs` | number | Delay before animation starts |
| `staggerIndex` | boolean | Stagger by row index within parent |
| `hoverSurface` | string | `none` \| `default` (theme `--color-hover`) \| `accent` (theme `--color-accent-hover`) \| `muted` (theme `--color-muted`) |
| `hoverTransform` | string | `none` \| `lift` \| `scale-up` \| `scale-down` \| `glow` |
| `hoverRotateDeg` | number | -45–45; degrees appended to hover transform |
| `hoverDurationMs` | number | 0–2000; hover transition duration (default 150ms) |
| `hover` | string | **Deprecated** — `none` \| `lift` \| `glow`; maps to `hoverTransform` when unset |
| `transition` | string | `none` \| `layout` \| `all` |

Interactive hover resolves to the `ui-motion-hover-interactive` class plus CSS variables (`--motion-hover-bg`, `--motion-hover-transform`, `--motion-hover-shadow`, `--motion-hover-duration`) on the row wrapper. Style rules cannot express `:hover` pseudo-states — use motion presets for hover background and transforms.

**Note:** Motion applies to component rows and the document root only — not to `container` or `grid` configs directly.

---

## Card list with motion

```json
{
  "showActions": true,
  "motion": { "entrance": "fade", "durationMs": 250 },
  "root": {
    "type": "root",
    "id": "root-card",
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
                  "motion": { "entrance": "slide-up", "durationMs": 300, "staggerIndex": true },
                  "component": {
                    "kind": "grid",
                    "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
                    "gap": "12px",
                    "rows": [
                      {
                        "type": "component",
                        "id": "track-left",
                        "component": {
                          "kind": "container",
                          "rows": [
                            {
                              "type": "component",
                              "id": "row-title",
                              "component": {
                                "kind": "text",
                                "primary": { "type": "field", "path": "name" }
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
                              "id": "row-badge",
                              "component": {
                                "kind": "badge",
                                "primary": { "type": "field", "path": "status" }
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
```

---

## Related

- [Style property reference](../appendix/style-property-reference.md) — full property list
- [Responsive visibility](./responsive-visibility.md) — breakpoint show/hide (not style-based)
