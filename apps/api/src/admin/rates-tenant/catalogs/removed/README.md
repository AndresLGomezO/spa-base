# Archived Rates seed definitions (not seeded)

Definitions removed from active catalogs during v1 cleanup. **Seed does not read this folder** — only parent `catalogs/*.json` files are imported by `seedRatesCatalogs`.

## Contents

| File                            | Count | What was removed                                              |
| ------------------------------- | ----- | ------------------------------------------------------------- |
| `rates-query-definitions.json`  | 37    | Orphan metrics pass (17) + sidebar-only queries (20)          |
| `rates-metric-definitions.json` | 19    | Unused balance-sheet / all-time / payment rollup metrics      |
| `rates-custom-views.json`       | 17    | Sidebar-only custom views (not linked from dashboard widgets) |

## Active catalog after v1 sidebar cleanup

**Custom views (4):** widget “See all” targets only — all have `hiddenFromNav: true` (not in sidebar):

| viewId                    | Query                   |
| ------------------------- | ----------------------- |
| `transactions-this-month` | Transactions this month |
| `upcoming-payments`       | Upcoming payments       |
| `due-today`               | Due today               |
| `payments-due-this-month` | Due this month          |

**Sidebar:** entity links only (`actor`, `account`, `financialItem`, `transaction`, etc.).

**Queries kept (10):** widget/chart/metric deps + widget-linked view queries (above).

`Upcoming payments (dashboard)` remains in `.local/tenant-import/ui/` for the Financial Snapshot widget until promoted to catalogs.

## Restore a definition

1. Copy the entry from archived JSON into the matching active catalog (`../rates-*.json`).
2. For custom views, also restore the backing query if it was archived.
3. Re-run `pnpm exec tsx .local/seed-usage-reference/analyze-rates-seed-usage.ts`.
4. Re-seed: `pnpm --filter=api seed:database`

## Re-run inventory

```bash
pnpm exec tsx .local/seed-usage-reference/analyze-rates-seed-usage.ts
```
