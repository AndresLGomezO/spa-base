# Rates Tenant — Data Hooks Pending Backlog

Outstanding Rates automation and ops work. Shipped hooks: [`rates-data-hooks.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-data-hooks.json) (28 enabled) — import via `pnpm seed:database`.

Entity schemas and balance conventions: [rates-data-model.md](./rates-data-model.md). Platform asks: [data-hooks-platform-gaps.md](./data-hooks-platform-gaps.md).

---

## Table of contents

1. [Pending automation rules](#1-pending-automation-rules)
2. [Loan plan behavior (shipped)](#2-loan-plan-behavior-shipped)
3. [Ops and verification](#3-ops-and-verification)

---

## 1. Pending automation rules

### Loan plan (`loanDetails`)

| ID | Rule | Status | Notes |
|----|------|--------|-------|
| LD-01 | Evolving P/I plan (hook JSON math) | **Shipped** | `Generate loan payment plan` — all formulas in catalog JSON |
| LD-01a | Persist inferred `loanDetails.originationDate` | **Shipped** | **NONE / flat plans only** — skipped for FRENCH/GERMAN/etc. |
| LD-02 | Replan on term / rate / type changes | **Shipped** | Same hook expressions as LD-01 |
| LD-04 | Replan when `loanMonthlyCost` changes | **Shipped** | Bumps `loanDetails.planRevision` → LD-02 |

### Deferred revolving credit (`loanUtilization`)

| ID | Rule | Status | Notes |
|----|------|--------|-------|
| LU-01 | Apply draw to balance and replan | **Shipped** | `Apply utilization to balance and replan` — increases `currentBalance`, bumps `planRevision` → LD-02 |
| TX-03a | Replan after payment | **Shipped** | `Replan loan after payment` — bumps `planRevision` after TX-03 on debt PAYMENT transactions |

### Loan monthly costs (`loanMonthlyCost`)

| ID | Rule | Status | Notes |
|----|------|--------|-------|
| LD-04 | Replan on cost create/update/delete | **Shipped** | `Replan loan on monthly cost *` hooks |

### Transactions (`transaction`)

| ID | Rule | Gap | Next step |
|----|------|-----|-----------|
| TX-03 | Balance update on PAYMENT | **Shipped** | Decreases liability `currentBalance`; TX-03a chains LD-02 replan for loans with `loanDetails` |

### Other

| ID | Rule | Gap | Next step |
|----|------|-----|-----------|
| EX-03 | Due-date alerts / reminders | Blocked on platform notifications | See [data-hooks-platform-gaps.md](./data-hooks-platform-gaps.md) |

---

## 2. Loan plan behavior (shipped)

All domain math is in **[`rates-data-hooks.json`](../apps/api/src/admin/rates-tenant/catalogs/rates-data-hooks.json)** — generic platform functions only (`pow`, `ln`, `if`, `switch`, `loopState`).

| Mode | When | Opening balance | Row count | Anchor |
|------|------|-----------------|-----------|--------|
| **Full plan** | `originationDate` set | `originalPrincipal` | `termMonths` | `originationDate` |
| **Mid-loan forward** | No `originationDate` | `currentBalance` | `ceil(nper(...))` capped by `termMonths` | `nextDueDate` |

Per-row P/I by `amortizationType` (FRENCH / GERMAN / AMERICAN / BULLET / NONE) is expressed via `switch` in LD-01/LD-02. Quoted rate → monthly decimal uses a generic `switch` on `loanDetails.interestRateQuote` in catalog JSON (`EA` / `NA` / `NMV`). **GERMAN** (Crediservice): principal `loopState/termMonths`, declining payment; **FRENCH** (hipotecas): fixed cuota.

**Monthly add-ons:** zero or more `loanMonthlyCost` rows per loan. LD-01/LD-02 sum `ACTIVE` costs into `paymentSchedule.additionalPortion`; `expectedAmount = P + I + additionalPortion`. `financialItem.amount` remains the bank P+I cuota only.

`loanDetails.principalPortion` / `interestPortion` are optional **bank-statement snapshots** on current balance (import convenience); evolved values live on `paymentSchedule` rows.

---

## 3. Ops and verification

| Item | Notes |
|------|--------|
| **Scheduled hooks (PS-02 overdue, FI-04 extension)** | Worker needs `SCHEDULED_HOOK_USER_UID` + Cloud Scheduler → `POST /tasks/schedule-tick` |
| **Demo seed** | Replays FI-03 / LD-01 via [`seed-replay-payment-schedule-hooks.ts`](../apps/api/src/admin/rates-tenant/seed-replay-payment-schedule-hooks.ts) |
| **Manual QA** | Hipoteca Altavista mid-loan: first row interest ~2,978,670, principal ~716,330, additionalPortion 120,000, expectedAmount ~3,815,000, ~196 UPCOMING rows from `nextDueDate` |
| **Tests** | Catalog JSON validates via `data-hook-definition-json.test.ts`; LD-01 / LU-01 / TX-03a runtime tests in `packages/hooks` |

---

## Related documentation

- [rates-data-model.md](./rates-data-model.md)
- [data-hook-definition-json.md](./data-hook-definition-json.md)
- [data-hooks-platform-gaps.md](./data-hooks-platform-gaps.md)
