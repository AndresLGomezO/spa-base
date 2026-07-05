# Style property reference

Complete list of `StyleRule.property` values. Each rule is `{ "property": "<key>", "value": "<token or css>" }`.

---

## ThemeToken (color properties)

Use on `backgroundColor`, `color`, and `borderColor`:

| Token | Typical use |
|-------|-------------|
| `default` | Standard text / surface |
| `muted` | De-emphasized backgrounds and text |
| `primary` | Brand accent |
| `success` | Positive states |
| `warning` | Caution states |
| `danger` | Error / destructive states |
| `info` | Informational highlights |
| `background` | Page / panel background |
| `foreground` | Primary text on background |
| `transparent` | No fill |

```json
{ "property": "backgroundColor", "value": "primary" }
```

```json
{ "property": "color", "value": "foreground" }
```

**Custom color values:** hex (`#1a2b3c`), `rgb()` / `hsl()`, `var(--color-*)`, tenant `customTokens`, gradients via `background` at render time.

---

## Shadow token (`boxShadow`)

| Value | Effect |
|-------|--------|
| `none` | No shadow |
| `card` | Platform card elevation (`var(--shadow-card)`) |

```json
{ "property": "boxShadow", "value": "card" }
```

Custom: `var(--shadow-card)` or full box-shadow strings.

---

## Typography

| Property | Theme guidance | Custom examples |
|----------|----------------|-----------------|
| `fontFamily` | `var(--font-sans)` | `"Georgia, serif"` |
| `fontSize` | `var(--text-body)`, `var(--text-heading)` | `"14"`, `"1.125rem"` |
| `fontWeight` | — | `"bold"`, `"600"`, `"normal"` |
| `fontStyle` | — | `"italic"`, `"normal"` |
| `textDecoration` | — | `"underline"`, `"none"` |
| `textAlign` | — | `"left"`, `"center"`, `"right"` |
| `textWrap` | — | `"wrap"`, `"nowrap"`, `"balance"` |
| `letterSpacing` | — | `"0.05em"`, `"var(--spacing-tight)"` |

Integers for `fontSize` render as pixels.

---

## Spacing and size

| Property | Applied on | Theme guidance |
|----------|------------|----------------|
| `marginTop` | Row wrapper | Integer px; negatives allowed to −999 |
| `marginBottom` | Row wrapper | Same |
| `marginLeft` | Row wrapper | Same |
| `marginRight` | Row wrapper | Same |
| `paddingTop` | Component / container | `var(--spacing-*)` or px string |
| `paddingBottom` | Component / container | Same |
| `paddingLeft` | Component / container | Same |
| `paddingRight` | Component / container | Same |
| `padding` | Component / container | Shorthand; `var(--spacing-macro)` |
| `gap` | Container / grid | `var(--spacing-tight)` … `var(--spacing-section)` |
| `width` | Component / row wrapper | `var(--sidebar-width)`, `"100%"`, `"auto"` |
| `minWidth` | Component / row wrapper | Same |
| `maxWidth` | Component / row wrapper | Same |
| `height` | Component / row wrapper | Same |
| `minHeight` | Component / row wrapper | Same |
| `maxHeight` | Component / row wrapper | Same |

### Platform layout tokens

| CSS variable | Purpose |
|--------------|---------|
| `--radius-sm`, `--radius-md`, `--radius-lg` | Border radius |
| `--spacing-tight` … `--spacing-section` | Semantic spacing |
| `--text-body`, `--text-heading` | Typography sizes |
| `--font-sans` | Font family |
| `--shadow-card` | Card shadow |
| `--sidebar-width` | Sidebar width reference |

Do not override `--spacing` (Tailwind scale multiplier).

---

## Border

| Property | Values |
|----------|--------|
| `borderRadius` | `var(--radius-lg)`, `"8"`, `"50%"` |
| `borderTopLeftRadius` | Per-corner radius |
| `borderTopRightRadius` | Per-corner radius |
| `borderBottomLeftRadius` | Per-corner radius |
| `borderBottomRightRadius` | Per-corner radius |
| `borderWidth` | `"1"`, `"2px"` |
| `borderColor` | ThemeToken or `var(--color-*)` |
| `borderStyle` | `"solid"`, `"dashed"`, `"none"` |

---

## Flex and alignment

| Property | Applied on | Values |
|----------|------------|--------|
| `alignItems` | Container / grid | `"start"`, `"center"`, `"end"`, `"stretch"` |
| `justifyContent` | Container | Flex justify values |
| `alignSelf` | Component | Per-item alignment in flex/grid |
| `flex` | Component | `"1"`, `"0 0 auto"` |
| `flexWrap` | Container | `"wrap"`, `"nowrap"` |

Use `grid.alignItems` for track alignment; reserve flex alignment for within-container stacking.

---

## Overflow and layering

| Property | Applied on | Values |
|----------|------------|--------|
| `overflowX` | Row wrapper | `"hidden"`, `"auto"`, `"scroll"` |
| `overflowY` | Row wrapper | Same |
| `position` | Row wrapper | `"relative"`, `"absolute"`, `"fixed"` |
| `top`, `right`, `bottom`, `left` | Row wrapper | Offset values |
| `zIndex` | Row wrapper | `"0"`, `"10"`, `"auto"` |
| `pointerEvents` | Row wrapper | `"none"`, `"auto"` |
| `opacity` | Row wrapper | `0`–`100` integer (→ `0`–`1`) or decimal `0`–`1`; prefer **rgba on `color`/`backgroundColor`** for partial transparency on text/pills |
| `backdropFilter` | Row wrapper | `"blur(8px)"` |

---

## Grid placement (advanced)

| Property | Purpose |
|----------|---------|
| `gridColumn` | Span or place item in grid (e.g. `"1 / 3"`) |
| `gridRow` | Row placement in grid |

Prefer structural `gridTemplateColumns` over `gridColumn` for primary layout.

---

## Responsive grid properties (legacy root styles)

These apply to **root.styles** on column roots for legacy responsive column grids. Prefer `kind: "grid"` for new designs.

| Property | Purpose |
|----------|---------|
| `gridColumns` | Column count at `base` |
| `gridColumnsSm` | Column count at `sm` |
| `gridColumnsMd` | Column count at `md` |
| `gridColumnsLg` | Column count at `lg` |
| `gridColumnsXl` | Column count at `xl` |
| `gridAutoFitMinWidth` | Auto-fit min column width (px) |
| `gridResponsiveMode` | `"fixed"` \| `"autoFit"` |

---

## Full property list (alphabetical)

```
alignItems
alignSelf
backdropFilter
backgroundColor
borderBottomLeftRadius
borderBottomRightRadius
borderColor
borderRadius
borderStyle
borderTopLeftRadius
borderTopRightRadius
borderWidth
bottom
boxShadow
color
flex
flexWrap
fontFamily
fontSize
fontStyle
fontWeight
gap
gridAutoFitMinWidth
gridColumn
gridColumns
gridColumnsLg
gridColumnsMd
gridColumnsSm
gridColumnsXl
gridResponsiveMode
gridRow
height
justifyContent
left
letterSpacing
marginBottom
marginLeft
marginRight
marginTop
maxHeight
maxWidth
minHeight
minWidth
opacity
overflowX
overflowY
padding
paddingBottom
paddingLeft
paddingRight
paddingTop
pointerEvents
position
right
textAlign
textDecoration
textWrap
top
width
zIndex
```

---

## Example: styled card track

```json
{
  "kind": "container",
  "styles": [
    { "property": "backgroundColor", "value": "background" },
    { "property": "borderRadius", "value": "var(--radius-lg)" },
    { "property": "boxShadow", "value": "card" },
    { "property": "padding", "value": "var(--spacing-macro)" }
  ],
  "rows": [
    {
      "type": "component",
      "id": "row-title",
      "component": {
        "kind": "text",
        "primary": { "type": "field", "path": "name" },
        "styles": [
          { "property": "fontSize", "value": "var(--text-heading)" },
          { "property": "fontWeight", "value": "bold" },
          { "property": "color", "value": "foreground" }
        ]
      }
    }
  ]
}
```

---

## Image overlay mode

On `image` components with `displayMode: "overlay"` inside a `container`:

- Renderer layers overlay images behind sibling content
- Container auto-sets `position: relative` unless overridden
- **Full-bleed backgrounds:** `objectFit: "cover"`
- **Decorative charts:** place the image row **last** in `container.rows`, use `objectFit: "contain"`, and negative `marginBottom` on the row (e.g. `-110`) to anchor at the card bottom — see [Total Balance card recipe](../07-recipes/total-balance-card.md)
- Static sources: HTTPS URL, `/images/...` app path, or serialized entity-file JSON from builder upload

---

## Opacity vs rgba

`opacity` on a row affects the **entire subtree** (text, icons, pills). For semi-transparent text or pill backgrounds, set `color: rgba(...)` or `backgroundColor: rgba(...)` on the component instead.

```json
{ "property": "color", "value": "rgba(255,255,255,0.8)" }
```

`opacity` accepts integers `0`–`100` (mapped to `0`–`1`) or decimal strings `0`–`1`.

---

## Related

- [Style rules and motion](../01-layout-tree/style-rules-and-motion.md) — attachment layers
- [SYNC](../SYNC.md) — `theme.style-rules` atom regeneration
