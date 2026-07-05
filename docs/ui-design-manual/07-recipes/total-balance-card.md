---
aiContextFragmentId: ui.recipes.total-balance-card
title: Total Balance gradient KPI card
surfaces: [metricsRowDesigner, metricWidget]
---

## Goal

Build a **gradient KPI card** with header (title + icon + period pill), a derived metric value, a growth badge, and a **decorative area chart** anchored at the bottom of the card.

## When to use

- Entity metrics row (`metricWidgets[]` + `metricRowLayout`) when a single rich card is needed instead of a flat KPI strip.
- Dashboard-style presentation on list main pages via `page-metrics` / metrics row designer.

## Step-by-step

1. **Outer sizing shell** — column `container` with `width: "100%"`, `minHeight: "200"`, `maxWidth: "500"`. Do not set a large `minWidth` — it prevents the metrics-row preview width slider from shrinking the card and causes clipping.
2. **Gradient card** — nested column `container` with `backgroundColor: "var(--gradient-primary)"`, `borderRadius: "var(--radius-lg)"`, `padding: "var(--spacing-macro)"`, `boxShadow`, `height: "100%"`, `overflowX/Y: "hidden"`.
3. **Header row** — `stackDirection: "row"`, `justifyContent: "between"`, `alignItems: "start"`:
   - Left: row with `text` ("Total Balance", `color: rgba(255,255,255,0.8)`) + `icon` (Eye, `rgba(255,255,255,0.7)`).
   - Right: `text` pill ("This month") with `backgroundColor: rgba(255,255,255,0.2)`, `backdropFilter: blur(8px)`, pill padding/radius on the **text** component.
4. **Body column** — `gap: var(--spacing-compact)`:
   - `metric-derived-kpi` (e.g. Income by Month − Outflows by Month) with `dimensionBindings.date` → `dashboardDateFilter`.
   - `metric-kpi` bound to a computed metric (e.g. `Total Balance MoM %`) with `parameterBindings.currentPeriod` → `dashboardDateFilter`.
5. **Chart overlay (last sibling)** — `image` with `displayMode: "overlay"`, `objectFit: "cover"`, `width: "100%"` on row/component styles, and `marginBottom: "-110"` to anchor at the card bottom. Place the chart row **after** header and body.
6. **Chart asset** — upload PNG in the builder (serialized entity-file JSON ref) or use `/images/...` / `https://` static URL. See [image overlay](../03-components/image.md#decorative-chart-overlay).
7. **Register widget** — add to `metricWidgets[]` with stable `id`; reference via `metric-widget` in `metricRowLayout`.

## Layout sketch

```
metricWidget.root
└── MainContainer (minWidth/maxWidth/minHeight)
    └── Content
        └── gradient card (column)
            ├── header row [title+icon | period pill]
            ├── body column [metric-kpi Net Balance | metric-kpi MoM %]
            └── chart image (overlay, marginBottom -110, contain)  ← LAST
```

## Transparency and color

Prefer **rgba on `color` / `backgroundColor`** for semi-transparent text and pills. Do not use `opacity` on a row when children must stay visible — `opacity` applies to the entire row subtree.

## Reference fixture

See [`total-balance-card-metric-widget.component-row.json`](../../../apps/web/app/features/ui-builder/fixtures/total-balance-card-metric-widget.component-row.json) and the Rates seed catalog [`rates-entity-ui-overrides.json`](../../../apps/api/src/admin/rates-tenant/catalogs/rates-entity-ui-overrides.json).

## Common mistakes

- Putting the chart overlay **first** in `container.rows` (use **last** + negative `marginBottom` for bottom anchoring).
- Using `objectFit: "cover"` for decorative charts (use `contain`).
- Using `opacity: "0.8"` for text fade — use `color: rgba(255,255,255,0.8)` instead.
- Binding a simple sum metric when the design calls for **derived** KPI (income − outflows).

## Related

- [image](../03-components/image.md) — overlay modes and static sources
- [metric bindings](../02-data-binding/metric-bindings.md) — `metric-derived-kpi`, `dashboardDateFilter`
- [kpi-strip](./kpi-strip.md) — horizontal multi-KPI alternative
