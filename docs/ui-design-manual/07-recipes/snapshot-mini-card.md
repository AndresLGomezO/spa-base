---
aiContextFragmentId: ui.recipes.snapshot-mini-card
title: Dashboard snapshot mini card
surfaces: [metricWidget, dashboardSection]
---

## Goal

Build a **compact themed snapshot card** (header + body + action) for dashboard grid tracks. Each card is a `metricWidgets[]` entry referenced by `metric-widget` in a dashboard section layout.

## When to use

- Financial Snapshot–style dashboard rows with 3+ mini cards in a horizontal `grid`.
- Themed status cards (destructive / warning / success) with count pill, hero metric, and CTA row.
- Cards embedded in dashboard section tracks where **intrinsic height** is preferred over filling a fixed parent.

## Step-by-step

1. **Single card container at root** — `metricWidget.root.columns[0].rows[0]` is one column `container` (`row-*-shell`) that holds **all card chrome** (glass `--color-card` fill, `backdropFilter`, themed glow overlay child, `borderRadius: 16`, `padding`, `--shadow-card`, `overflowY: hidden`). Do **not** add a second nested `*-card` wrapper inside a sizing shell.
2. **Section spacing with `gap`** — on the shell container set `gap: var(--spacing-comfortable)` and stack exactly three child rows: **header**, **body**, **action**.
3. **Header row** — `stackDirection: row`, `justifyContent: between`, `alignItems: center`:
   - Left: `text` title (`fontSize: 14`, theme color, `minWidth: 0`).
   - Right (optional): count `metric-kpi` with pill styles **on the KPI itself** (`backgroundColor: color-mix(… 20%)`, `borderRadius: 999`, `padding: var(--spacing-compact)`). Do **not** wrap the KPI in an extra pill `container`.
4. **Body column** — `stackDirection: column`, `alignItems: center`, `justifyContent: center`, `width: 100%`, `gap: var(--spacing-tight)`:
   - **Icon + value variant:** `icon` + hero `metric-kpi` + caption `text`.
   - **Donut variant:** `chart` component referencing a `donut` chart definition (`metricValue` source, e.g. `Payment Progress %` bound to `dashboardDateFilter`) sized `80×80` + caption `text`. Do **not** use a fake CSS ring `container` — the chart renderer draws the arc and center label.
5. **Action row** — put `clickAction` on the **row node** (not on a child). Inner `container` uses themed tinted `backgroundColor`, `borderRadius: 12`, horizontal padding, `justifyContent: between` with label `text` + `ChevronRight` `icon`.

## Layout sketch

```
metricWidget.root
└── shell container (column, gap: comfortable, card chrome)
    ├── header row [title | count metric-kpi pill]
    ├── body column (gap: tight) [icon | value | subtext]  OR  [donut chart | subtext]
    └── action row (clickAction) [label | chevron]
```

## Why this pattern works

| Approach | Problem |
|----------|---------|
| Nested `shell → card` containers | Extra flex level; `height: 100%` on inner card has no definite parent in dashboard `metric-widget` embeds → collapsed or clipped layout. |
| `flex: 1` on body + `marginTop: auto` on action | Dashboard grid tracks do not always establish a stretching flex column; auto margins and flex-grow silently fail. |
| `marginBottom` / `marginTop` between sections | Fragile in nested stacks; duplicates spacing already solved by `gap`. |
| Pill wrapper `container` around count KPI | Adds an extra layout box; padding/background on the wrapper may not hug the KPI text. Style the **leaf** `metric-kpi` instead. |

Prefer **intrinsic height + `gap`** so the card sizes to its content inside `metric-widget` grid tracks.

## Theme tokens

Use semantic theme colors with `color-mix` tints:

| Role | Example (destructive) |
|------|------------------------|
| Card fill | `color-mix(in oklch, var(--color-destructive) 14%, transparent)` |
| Count pill | `color-mix(in oklch, var(--color-destructive) 20%, transparent)` |
| Action bar | `color-mix(in oklch, var(--color-destructive) 24%, transparent)` |
| Text / icons | `var(--color-destructive)` |

Swap `destructive` → `warning` or `success` for other cards.

On the Rates Financial Snapshot dashboard, mini cards use **glass v2 surfaces** (same frosted `--color-card` + `backdropFilter` as metric cards) but stay visually distinct via compact layout (header / body / CTA), smaller `borderRadius: 16`, and unique accent + glow pairings:

| Widget | Accent token | Glow overlay |
|--------|--------------|--------------|
| Due Today | `--color-destructive` | `--gradient-card-glow-danger` |
| Upcoming | `--color-primary` | `--gradient-card-glow-neutral` |
| Payment Progress | `--color-primary-400` (cyan) | `--gradient-card-glow-blue` |

Use themed `color-mix` tints on count pills and action bars (20% / 24%) — not on the card shell fill. Metric KPI cards (Income / Expenses / Invest) use the same glass base but fill a larger row with chart overlays and different glow semantics (success / danger / warning).

## Reference (local Rates slice)

Canonical examples live in the local tenant import slice (not under `apps/web`):

- [`.local/tenant-import/ui/paymentSchedule-entity-ui-overrides.json`](../../../.local/tenant-import/ui/paymentSchedule-entity-ui-overrides.json) — `due-today-snapshot-mini`, `upcoming-week-snapshot-mini`, `budget-status-snapshot-mini`
- [`.local/tenant-import/ui/tenant-dashboard-layout-slice.json`](../../../.local/tenant-import/ui/tenant-dashboard-layout-slice.json) — `track-spending-snapshot` mini grid

Reload with `pnpm seed:database` after editing slice JSON.

## Common mistakes

- Adding `height: 100%` on the card shell when the parent track has no fixed height.
- Using `flex: 1` / `minHeight: 0` on the body to “push” the action bar — use `gap` on the shell instead.
- Wrapping count KPIs in a decorative `container` — apply pill styles on `metric-kpi` directly.
- Putting `clickAction` on the inner container instead of the action **row** node.
- Using per-side `paddingLeft`/`paddingRight` on pill wrappers instead of `padding: var(--spacing-compact)` on the KPI.

## Related

- [container](../03-components/container.md) — `gap` on column containers
- [metric-kpi](../03-components/metric-kpi.md) — KPI styling and bindings
- [metric bindings](../02-data-binding/metric-bindings.md) — `parameterBindings` for dashboard date filter (budget ring)
- [kpi-strip](./kpi-strip.md) — horizontal multi-KPI alternative
- [total-balance-card](./total-balance-card.md) — large gradient card (uses nested shell + `height: 100%` intentionally for fixed-height row layouts)
