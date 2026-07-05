# Component: image

## Purpose

**When to use:** Show an entity image field (`EntityFileReference`) or a static URL.

**When not to use:** Icons — use `icon`. User avatars — use `user`.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | Yes |
| `tableColumnCell` | Yes |
| `tableRowExpand` | Yes |
| `mainPage` | No |
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
| `primary` | `DataSource` | Yes | Field or static URL. | Image source. |
| `fallbacks` | `DataSource[]` | No | Resolved in order. | Placeholder image. |
| `imageSize` | `number` | No | Pixels (width/height). | Thumbnail size. |
| `displayMode` | `inline` \| `overlay` | No | Default `inline`. | Layout mode for overlays. |
| `objectFit` | `contain` \| `cover` \| `fill` | No | CSS object-fit. | Crop behavior. |
| `label` | `LabelConfig` | No |  | Optional caption. |
| `styles` | `StyleRule[]` | No |  | Border radius, margins. |
| `conditionalStyles` | `ConditionalStyleRule[]` | No |  | Value-based styling. |

## Interactions

Read-only. May open lightbox when `displayMode` is `overlay`.

## Binding

DataSource on `primary` / `fallbacks`. Use field path like `logo`.

## Minimal example

```json
{
  "kind": "image",
  "primary": {
    "type": "field",
    "path": "logo"
  },
  "imageSize": 40
}
```

## Realistic example

```json
{
  "kind": "image",
  "primary": {
    "type": "field",
    "path": "logo"
  },
  "fallbacks": [
    {
      "type": "static",
      "value": "/assets/placeholder.png"
    }
  ],
  "imageSize": 48,
  "displayMode": "inline",
  "objectFit": "contain",
  "label": {
    "show": true,
    "text": "Logo",
    "position": "above"
  }
}
```

## Common mistakes

- Omitting `imageSize` on dense card layouts.
- Using relation display paths for image fields — image fields are top-level.
- Static URL without `https://`, valid `/images/...` path, or uploaded entity-file JSON ref.
- Placing decorative chart overlays **first** in `container.rows` when the design needs bottom anchoring — use **last sibling** + negative `marginBottom` (see below).

## Decorative chart overlay

For KPI cards with a background area chart (not a full-bleed photo):

1. Put the `image` row **last** among siblings inside the gradient `container`.
2. Set `displayMode: "overlay"` and `objectFit: "cover"` (or `contain` for letterboxed charts).
3. Set `width: "100%"` on hoisted row/component styles so the overlay tracks the card width (overlay rows must not use `w-fit` shrink).
4. Add `marginBottom: "-110"` (tune per asset) on hoisted styles to pull the chart under the KPI text.
4. Use one of these `primary` static sources:
   - **Builder upload** — serialized entity-file JSON (`storagePath`, `fileName`, `contentType`, `downloadUrl`) from the layout static image uploader.
   - **App asset path** — `"/images/my-chart.svg"` (served from `apps/web/public/`).
   - **HTTPS URL** — `"https://cdn.example/chart.png"`.

```json
{
  "type": "component",
  "id": "row-total-balance-chart",
  "component": {
    "kind": "image",
    "displayMode": "overlay",
    "objectFit": "contain",
    "primary": {
      "type": "static",
      "value": "/images/total-balance-area-chart.svg"
    }
  },
  "styles": [
    { "property": "marginBottom", "value": "-110" }
  ]
}
```

**When to use `cover` vs `contain`:** `cover` for full-bleed background fills; `contain` for decorative charts that should preserve aspect ratio at the bottom of a card.

## Related

- [Total Balance card recipe](../07-recipes/total-balance-card.md)
