# Rates Tenant — Metrics Guide

End-to-end guide for metrics on the **`rates` dev tenant**: seeded definitions, source models, and KPI/Series wiring. Complements [metrics-consumption.md](./metrics-consumption.md) and [rates-data-model.md](./rates-data-model.md).

---

## 1. Core concepts

A **metric definition** tells the aggregation engine which entity to watch (`sourceModel`), what to compute (`aggregations`), and how to slice rows (`groupBy`, `dimensions`). Pre-aggregated results are read in O(1) by KPI and Series widgets.

**Catalog location:** [`apps/api/src/admin/rates-tenant/catalogs/rates-metric-definitions.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-metric-definitions.json) (20 metrics, seeded on API startup).

---

## 2. Source models

| Model | Use for |
|-------|---------|
| `transaction` | Income, expenses, payments, interest — actual cash movements |
| `financialItem` | Balances, assets, liabilities — commitment-level totals |
| `paymentSchedule` | Upcoming and overdue payment amounts |
| `loanDetails` | Debt service (scheduled payment totals) |

---

## 3. Metric catalog overview

### Transaction metrics

| Name | Aggregation | Filter |
|------|-------------|--------|
| Total Income (All Time) | SUM amount | type=INCOME |
| Total Expenses (All Time) | SUM amount | type=EXPENSE |
| Total Payments (All Time) | SUM amount | type=PAYMENT |
| Income by Month | SUM amount | type=INCOME, groupBy month |
| Expenses by Month | SUM amount | type=EXPENSE, groupBy month |
| Interest Earned (All Time) | SUM amount | type=INTEREST |

### Financial item metrics

| Name | Aggregation | Filter / groupBy |
|------|-------------|------------------|
| Total Assets | SUM currentBalance | balanceSheetRole=ASSET |
| Total Liabilities | SUM currentBalance | balanceSheetRole=LIABILITY |
| Assets by Role | SUM currentBalance | groupBy balanceSheetRole |

### Payment schedule metrics

| Name | Aggregation | Filter |
|------|-------------|--------|
| Upcoming Payments Total | SUM expectedAmount | status=UPCOMING |
| Overdue Payments Total | SUM expectedAmount | status=OVERDUE |

### Loan details metrics

| Name | Aggregation |
|------|-------------|
| Total Debt Service | SUM paymentAmount |

**Derived KPIs (UI-only):** Net result = income − expenses; Net worth = assets − liabilities. Bind two KPI widgets or compute in layout — not stored as metric definitions.

---

## 4. Demo data and backfill

Run **`pnpm seed:database`** after the API and emulators are up. Demo transactions live under [`seed-demo-data.ts`](../apps/api/src/admin/rates-tenant/records/seed-demo-data.ts) (`rd_txn_*` ids).

To see non-empty widgets locally:

1. Start API with emulators (`pnpm dev:docker` or equivalent).
2. Sign in as `testuser1@rates.com` / `RatesTest1!`.
3. Open Settings → Metrics — definitions should show ACTIVE with backfill completed.

If metrics are empty after a model change, reset Firestore (`pnpm dev:docker:reset`) so seed re-imports catalogs and re-backfills.

---

## 5. Wire KPI and Series widgets

1. Open **Design** layout for an entity view (e.g. `financialItem` list).
2. Add a **KPI** or **Series** widget.
3. Bind `metricDefinitionId` to a seeded metric name (e.g. "Total Income (All Time)").
4. For grouped metrics, supply dimension bindings matching `groupBy` / `dimensions` fields.

See [metrics-consumption.md](./metrics-consumption.md) for binding shapes and API contract.

---

## 6. Saved queries (companion layer)

35 saved queries in [`rates-query-definitions.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-query-definitions.json) power list views: Upcoming payments, Active commitments, Income this month, By property, etc. Wire via **query-viewer** widgets in Design layout.

---

## 7. Permissions and troubleshooting

| Action | Permission |
|--------|------------|
| View metrics | `metricDefinition.read` |
| Import catalog | `metricDefinition.create`, `update`, `delete`, `backfill` |
| Read metric values | `metric.read` + entity read on source model |

**View values:** `transaction.read`, `financialItem.read`, etc. (e.g. `normalRatesUser` on the rates tenant).

| Symptom | Check |
|---------|-------|
| KPI shows 0 | Metric backfill completed? Demo transactions exist for `ownerId`? |
| Definition missing | Catalog import failed at startup — check API logs for `[rates seed]` |
| Wrong totals | Filter on definition matches transaction `type` enum values |

---

## Related documentation

- [rates-data-model.md](./rates-data-model.md) — entity reference and dashboard blueprint
- [metric-definition-json.md](./metric-definition-json.md) — catalog JSON format
- [entity-query-definition-json.md](./entity-query-definition-json.md) — saved query catalog format
