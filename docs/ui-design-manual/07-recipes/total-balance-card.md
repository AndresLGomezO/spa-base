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
   - `metric-kpi` bound to `Total Balance by Month` with `parameterBindings.period` → `dashboardDateFilter`.
   - `metric-kpi` bound to a computed metric (e.g. `Total Balance MoM %`) with `parameterBindings.currentPeriod` → `dashboardDateFilter`.
5. **Chart overlay (last sibling)** — `chart` with `chartType: "area"`, `displayMode: "overlay"`, and `dataSource.type: "entityQuery"` with **`layout: "monthToDateRightAligned"`** (30 daily buckets, filled from the right through calendar today when the dashboard month matches the current month). Use `Transaction trend` with total-balance `rowFilters` / `valueTransforms` (expense, payment, and investment rows × `-1`). KPI still reads **`Total Balance by Month`** via metric bindings; the overlay shows daily net transaction totals month-to-date. Place the chart row **after** header and body.
6. **Chart styling** — hide legend/axes for KPI backgrounds; set series color (e.g. `rgba(255,255,255,0.95)` on gradient cards) and optional area fill opacity. Anchor the chart to the **bottom half** of the card with overlay row styles: `top: 50%`, `bottom: 0`, `left: 0`, `right: 0`, `width: 100%`.
7. **Register widget** — add to `metricWidgets[]` with stable `id`; reference via `metric-widget` in `metricRowLayout`.

## Layout sketch

```
metricWidget.root
└── MainContainer (minWidth/maxWidth/minHeight)
    └── Content
        └── gradient card (column)
            ├── header row [title+icon | period pill]
            ├── body column [metric-kpi Total Balance | metric-kpi MoM %]
            └── chart (overlay, bottom half: top 50%)  ← LAST
```

## Transparency and color

Prefer **rgba on `color` / `backgroundColor`** for semi-transparent text and pills. Do not use `opacity` on a row when children must stay visible — `opacity` applies to the entire row subtree.

## Reference (Rates seed catalog)

Canonical widget JSON lives in the tenant seed catalog only — not under `apps/web`:

- [`rates-entity-ui-overrides.json`](../../../apps/api/src/admin/rates-tenant/catalogs/rates-entity-ui-overrides.json) — `metricWidgets[]` entry `id: "total-balance-by-month"`, chart row `id: "row-total-balance-chart"`
- [`rates-ui-builder-presets.json`](../../../apps/api/src/admin/rates-tenant/catalogs/rates-ui-builder-presets.json) — compact Income / Expenses / Invest card presets

Reload with `pnpm seed:database` after editing catalog JSON.

## Common mistakes

- Putting the chart overlay **first** in `container.rows` (use **last** + negative `marginBottom` for bottom anchoring).
- Using `objectFit: "cover"` for decorative charts (use `contain`).
- Using `opacity: "0.8"` for text fade — use `color: rgba(255,255,255,0.8)` instead.
- Binding a simple sum metric when the design calls for **derived** KPI (income − outflows − investments).

## Related

- [chart](../03-components/chart.md) — metric-series and entity-query overlays
- [image](../03-components/image.md) — static decorative assets
- [metric bindings](../02-data-binding/metric-bindings.md) — `metric-derived-kpi`, `dashboardDateFilter`
- [kpi-strip](./kpi-strip.md) — horizontal multi-KPI alternative
