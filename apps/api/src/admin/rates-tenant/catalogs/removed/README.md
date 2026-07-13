# Archived Rates seed definitions (not seeded)

Definitions removed from active catalogs during v1 cleanup. **Seed does not read this folder** — only parent `catalogs/*.json` files are imported by `seedRatesCatalogs`.

## Contents

| File                            | Count | What was removed                                                |
| ------------------------------- | ----- | --------------------------------------------------------------- |
| `rates-query-definitions.json`  | 40    | Orphan metrics pass + sidebar-only + top-expense category chain |
| `rates-metric-definitions.json` | 20    | Unused balance-sheet / rollup + Category Outflow Partial MoM %  |
| `rates-chart-definitions.json`  | 1+    | Top category expense trend chart (no longer on dashboard)       |
| `rates-custom-views.json`       | 17    | Sidebar-only custom views (not linked from dashboard widgets)   |

## Active catalog after v1 sidebar cleanup

**Custom views (4):** widget “See all” targets only — all have `hiddenFromNav: true` (not in sidebar):

| viewId                    | Query                   |
| ------------------------- | ----------------------- |
| `transactions-this-month` | Transactions this month |
| `upcoming-payments`       | Upcoming payments       |
| `due-today`               | Due today (metrics)     |
| `payments-due-this-month` | Due this month          |

**Sidebar:** entity links only (`actor`, `account`, `financialItem`, `transaction`, etc.).

**Queries kept (8):** live dashboard + see-all views:

`Upcoming payments (dashboard)` (list through period end), `Due today (metrics)` (calendar day for Due Today KPIs), `Upcoming payments`, `Due this month`, `Transactions this month`, `Transaction trend`, `Overdue payments (metrics)`, `Upcoming this week (metrics)`.

`Due Today Total/Count` use **calendar today** (`Due today (metrics)`), not the Upcoming list scope. Overdue KPIs stay period-aware via `Overdue payments (metrics)`.

## Restore a definition

1. Copy the entry from archived JSON into the matching active catalog (`../rates-*.json`).
2. For custom views, also restore the backing query if it was archived.
3. Re-run `pnpm exec tsx .local/seed-usage-reference/analyze-rates-seed-usage.ts`.
4. Re-seed: `pnpm --filter=api seed:database`

## Reseed verification (pending payments)

After `pnpm --filter=api seed:database` (so `.local/tenant-import/ui` overwrites live queries **and** the schedule mock generator refreshes paymentSchedule/transaction):

- Current period: Upcoming Payments list shows unpaid through month end (including true overdue). Due Today Total/Count are **calendar today only** (often 0 when the list has no today-due rows).
- Overdue Count equals overdue rows in the Upcoming list.
- Going back a period still includes older unpaid rows up to that period’s end (no start-of-month floor).
- No long invented OVERDUE trail from 2022 when history starts later or has gaps (history is SSOT for past). Reseed also deletes orphan UUID schedules/transactions not in the generated id set.

## Re-run inventory

```bash
pnpm exec tsx .local/seed-usage-reference/analyze-rates-seed-usage.ts
```
