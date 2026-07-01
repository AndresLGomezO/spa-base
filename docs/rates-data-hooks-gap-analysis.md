# Rates Tenant — Data Hooks Pending Backlog

Outstanding Rates automation and ops work. Shipped hooks: [`rates-data-hooks.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-data-hooks.json) (24 enabled) — import via `pnpm seed:database`.

Entity schemas and balance conventions: [rates-data-model.md](./rates-data-model.md). Platform asks: [data-hooks-platform-gaps.md](./data-hooks-platform-gaps.md).

---

## Table of contents

1. [Pending automation rules](#1-pending-automation-rules)
2. [System hook (Phase D)](#2-system-hook-phase-d)
3. [Ops and verification](#3-ops-and-verification)

---

## 1. Pending automation rules

### Loan plan (`loanDetails`)

| ID | Rule | Gap | Next step |
|----|------|-----|-----------|
| LD-01 (full) | Declining-balance amortization per period | `createRecords` has `loopIndex` only — no running balance across iterations | [Phase D system hook](#2-system-hook-phase-d) |
| LD-02 (full) | Replan with recalculated principal/interest per row | Same as LD-01 full | Phase D + bump `planVersion` on replan |

### Transactions (`transaction`)

| ID | Rule | Gap | Next step |
|----|------|-----|-----------|
| TX-03 | Balance update by `balanceSheetRole` | PAYMENT always subtracts liability balance; asset contribution/withdrawal rules undefined | Product decision + conditional hook ([balance conventions](./rates-data-model.md#balance-update-conventions-payments)) |

### Other

| ID | Rule | Gap | Next step |
|----|------|-----|-----------|
| EX-03 | Due-date alerts / reminders | Blocked on platform notifications | See [data-hooks-platform-gaps.md](./data-hooks-platform-gaps.md) |

---

## 2. System hook (Phase D)

**True declining-balance amortization** (LD-01 / LD-02 full): per-period interest on *remaining balance* requires iterative state across loop iterations — not expressible in JSON data hooks with generic math only.

Implement as a **tenant system hook** in [`apps/api/src/admin/rates-tenant/`](../apps/api/src/admin/rates-tenant/).

---

## 3. Ops and verification

| Item | Notes |
|------|--------|
| **Scheduled hooks (PS-02 overdue, FI-04 extension)** | Worker needs `SCHEDULED_HOOK_USER_UID` + Cloud Scheduler → `POST /tasks/schedule-tick` ([worker `.env.dev.example`](../apps/worker-service/.env.dev.example)) |
| **Demo seed** | [`seed-demo-data.ts`](../apps/api/src/admin/rates-tenant/records/seed-demo-data.ts) bypasses hooks via `ensureRatesRecord`; migrate when hook-aware seed is validated |
| **Manual QA** | PAYMENT + `paymentScheduleId` → PAID, roll-forward, `nextDueDate`; pause/close → SKIPPED; loanDetails create → flat plan rows; TRANSFER → both account balances |
| **Tests** | Optional integration tests for compound where + `getRecord` + `aggregateMatching` |

---

## Related documentation

- [rates-data-model.md](./rates-data-model.md)
- [data-hook-definition-json.md](./data-hook-definition-json.md)
- [data-hooks-platform-gaps.md](./data-hooks-platform-gaps.md)
