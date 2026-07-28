# Workload inventory — by entity catalog (+ system)

**What this is:** the full set of workloads from
[workload-inventory.md](./workload-inventory.md),
**regrouped by tenant entity catalog** (`financialItem`, `account`, …) plus a
**System** bucket for platform fabric that is not entity-specific.

**What this is not:** an inventory of entities themselves. Entities are only
the **grouping axis**.

| Companion | Role |
| --------- | ---- |
| [workload-inventory.md](./workload-inventory.md) | Per-workload keep/remove diagnosis |
| [workload-system-catalog.md](./workload-system-catalog.md) | Registry kinds / wiring taxonomy |
| Seed hooks | [`.local/tenant-import/catalogs/data-hooks/`](../../.local/tenant-import/catalogs/data-hooks/) → dynamic `hook:rates:{hookId}` |
| Entity defs | [`.local/tenant-import/catalogs/entity-definitions/`](../../.local/tenant-import/catalogs/entity-definitions/) |

**How to read “in use” here**

| Label | Meaning |
| ----- | ------- |
| **LIVE** | Scheduled and/or event hooks fire in seed; or platform control-plane is required |
| **THIN** | Only AI-summary / invalidate CRUD hooks; no schedule tick fan-out for this entity alone |
| **NONE** | No dedicated workload rows for this entity (may still be touched as a *secondary* target inside another entity’s hooks) |
| **INACTIVE (mode)** | Provisioned; product mode leaves it no-op (e.g. Gmail push under poll) |

Dynamic workloads use id `hook:rates:{hookId}` (tenant `rates` in local seed).
They are executed by **System** → `scheduler:schedule-tick` (not by a
per-entity Scheduler job).

---

## A. System (not tied to one entity)

Platform fabric — **tenant-agnostic shared pipes**. Pausing these stops work
**across** tenants and entities. System does **not** encode which tenant
entities may use AI, hooks, or email; tenants express that in their own
catalog (dynamic `hook:{tenantId}:{hookId}`).

Chips on System rows in Section G are **seed attribution** for the rates
tenant (who currently enqueues onto the pipe), not platform ownership rules.

### Control plane

| Workload id | Kind | Role | Status |
| ----------- | ---- | ---- | ------ |
| `queue:ai-jobs` | queue | Chat, UI builder, record narrative refresh | LIVE |
| `queue:hook-jobs` | queue | Queued after-hooks + tenant deletion | LIVE |
| `queue:gmail-jobs` | queue | Gmail window-sync / process-message / watch-renew | LIVE |
| `scheduler:schedule-tick` | scheduler | Every-minute cron → runs **all** due `hook:*` | LIVE |
| `scheduler:gmail-poll` | scheduler | Every-5m mailbox poll (default delivery mode) | LIVE (poll) |
| `pubsub:aggregation-events-worker` | pubsub | Metric aggregation offload (staging/prod) | CONDITIONAL |
| `pubsub:gmail-push-api` | pubsub | Gmail watch → API (only when mode=`push`) | INACTIVE (default poll) |

### Worker HTTP + in-process (catalog leaves)

| Workload id | Controlled by / notes | Status |
| ----------- | --------------------- | ------ |
| `worker:process-data-hook` | `queue:hook-jobs` — any queued hook | LIVE |
| `worker:schedule-tick` | `scheduler:schedule-tick` — fans out entity hooks | LIVE |
| `worker:delete-tenant` | `queue:hook-jobs` | LIVE |
| `worker:process-ai-chat` | `queue:ai-jobs` | LIVE |
| `worker:process-ai-ui-builder` | `queue:ai-jobs` | LIVE |
| `worker:refresh-record-narrative` | `queue:ai-jobs` | LIVE |
| `worker:gmail-poll` | `scheduler:gmail-poll` | LIVE (poll) |
| `worker:gmail-window-sync` | `queue:gmail-jobs` | LIVE |
| `worker:gmail-process-message` | `queue:gmail-jobs` | LIVE |
| `worker:gmail-watch-renew` | `queue:gmail-jobs` | LIVE only in push mode |
| `inprocess:local-gmail-poll` | Local stand-in for gmail-poll | LIVE when `IS_LOCAL` |
| `inprocess:debounced-user-ai-memory` | Cross-entity L2 memory after summaries | LIVE |
| `inprocess:index-provisioner-queue` | Firestore indexes (API process) | LIVE |

### Review lean (System Phase 1)

| Workload | Verdict | Why |
| -------- | ------- | --- |
| `queue:ai-jobs` + `worker:process-ai-chat` + `worker:process-ai-ui-builder` + `worker:refresh-record-narrative` | **KEEP** | Shared Vertex budget pipe; job types are platform features |
| `queue:hook-jobs` + `worker:process-data-hook` + `worker:delete-tenant` | **KEEP** | Platform async side-effects; not entity-specific |
| `queue:gmail-jobs` + `worker:gmail-window-sync` + `worker:gmail-process-message` | **KEEP** | Integration fan-out isolation |
| `scheduler:schedule-tick` + `worker:schedule-tick` | **KEEP** | Single ticker for all tenants’ scheduled hooks |
| `scheduler:gmail-poll` + `worker:gmail-poll` + `inprocess:local-gmail-poll` | **KEEP** | Default delivery mode (poll + local stand-in) |
| `pubsub:aggregation-events-worker` | **KEEP (conditional)** | Env/workspace gated; prod metrics offload |
| `pubsub:gmail-push-api` + `worker:gmail-watch-renew` | **DEFER (product)** | Inactive under default poll; keep provisioned until poll-only decision |
| `inprocess:debounced-user-ai-memory` | **KEEP** | Platform L2 memory coalesce |
| `inprocess:index-provisioner-queue` | **KEEP** | Live Firestore index path |
| Former index Pub/Sub TF (`pubsub-index-provisioning.tf`) | **REMOVED** | Never in registry; gated off; in-process path is live — scaffolding deleted |

Do **not** merge poll + local-gmail-poll, or a `worker:*` with its parent queue/scheduler (false duplicates). See [workload-inventory.md](./workload-inventory.md) §7.

**Reasonability:** System pipes stay. Tenant-specific *scheduled* work is
dynamic `hook:*` under `scheduler:schedule-tick`, owned by each tenant’s data-hook
catalog — not by platform packages.

### Phase 2 handoff (tenant catalog)

System is locked. Next pass walks **rates seed** scheduled + event hooks
entity-by-entity with the same reasonability lens (required process?
duplicate? stale? cost?). Judgment examples (e.g. “LLM narrative on every
transaction is not a functional process”) apply to **catalog** keep/remove/
merge decisions — never as hardcoding into `@repo/*`.

---

## B. Workloads by entity

For each entity: **scheduled** dynamic workloads (appear in Platform →
Workloads as `hook:rates:…`), then **event** hooks (CRUD/email — not separate
Scheduler jobs, but they are the async/event workload surface for that
entity). Secondary entities touched by the same hook are noted.

---

### `financialItem` — LIVE (heaviest)

Commitment hub. Most loan/income/service/email cascades hang off this entity.

**Scheduled (`hook:rates:…`) — 8**

| Workload | Also touches |
| -------- | ------------ |
| `Extend schedule horizon` | `paymentSchedule` |
| `Generate domain AI summary text` | `portfolioSettings`, `category` |
| `Generate incomes portfolio AI summary text` | `portfolioSettings` |
| `Generate investments portfolio AI summary text` | `portfolioSettings` |
| `Generate loans portfolio AI summary text` | `portfolioSettings` |
| `Generate services portfolio AI summary text` | `portfolioSettings`, `category` |
| `Generate portfolio products signals` | `portfolioSettings` |
| `Generate product insights` | `portfolioSettings`, `transaction`, `productInsight` |

**Event (CRUD / email / chain) — ~29** (examples): Create initial schedule;
Generate/regenerate loan payment plan; Cascade delete; Create transaction from
email; Link payment to schedule; Visa statement hooks; Refresh loan/income/
investment/service AI summary JSON; Apply utilization / replan; …

**In use?** **Yes.** Primary product surface. Do not trim without killing
email-match + loan plan + portfolio AI.

---

### `paymentSchedule` — LIVE (CORE for metrics)

**Scheduled — 3**

| Workload | Also touches |
| -------- | ------------ |
| `Mark overdue schedules` | — |
| `Generate portfolio payments signals` | `portfolioSettings` |
| `Generate upcoming payment insights` | `portfolioSettings`, `upcomingPaymentInsight` |

**Event — 0** as primary (many live under `financialItem` / `transaction`:
create schedule, mark PAID, roll forward, …).

**Also:** System metrics/queries use `paymentSchedule` as `sourceModel` /
`sourceEntity` (dashboard KPIs) — driven by data changes + schedule-tick hooks
above, not separate queue workloads.

**In use?** **Yes.**

---

### `transaction` — LIVE (CORE for metrics + AI cascade)

**Scheduled — 5**

| Workload | Also touches |
| -------- | ------------ |
| `Categorize transaction` | `category`, `categoryExample` |
| `Enrich transactions` | `email`, `merchantEnrichment` |
| `Reconcile monthly spending` | `monthlySpendingSummary` |
| `Reconcile spending patterns` | `spendingPattern` |
| `Reset NEEDS_MANUAL to PENDING` | — |

**Event — ~6:** Adjust account balances; Apply monthly spending / spending
pattern; Learn category example; Mark schedule PAID; Replan loan after payment.

**In use?** **Yes.** Insights cascade (`force-insights-cascade.sh`) targets
these schedules.

---

### `portfolioSettings` — LIVE (AI / signals hub)

**Scheduled — 6** (portfolio narratives + spending signals/insights)

| Workload | Also touches |
| -------- | ------------ |
| `Generate portfolio AI summary text` | — |
| `Generate payments portfolio AI summary text` | — |
| `Generate products portfolio AI summary text` | — |
| `Generate spending portfolio AI summary text` | — |
| `Generate portfolio spending signals` | `spendingPattern`, `monthlySpendingSummary` |
| `Generate spending category insights` | `category`, `spendingCategoryInsight`, `spendingPattern` |

**Event — 3:** Invalidate payments/products/spending narrative on signals change.

**In use?** **Yes** for AI insight surfaces. Not a money ledger entity.

---

### `spendingPattern` — LIVE (thin schedule)

**Scheduled — 1:** `Evaluate spending patterns` (+ `monthlySpendingSummary`).

**Event:** mostly via `transaction` / `portfolioSettings` hooks.

**In use?** **Yes**, as insight write-model.

---

### `account` — THIN (as dedicated workloads)

**Scheduled — 0**

**Event — 1:** `Refresh account AI summary JSON` (CRUD).

Balances also updated from **transaction** event hooks (not listed here as
account-primary). Dashboard widgets read **metrics on transaction**, not an
account-specific Scheduler job.

**In use?** Entity **yes** (data + UI). **Dedicated workloads:** thin — almost
no account-named schedule.

---

### `actor` — THIN

**Scheduled — 0**

**Event — 1:** `Refresh actor AI summary JSON`.

**In use?** Entity yes; **workloads** thin (AI summary only).

---

### `loanDetails` — THIN as primary / LIVE via financialItem

**Scheduled — 0** as primary.

**Event — 1** as primary: `Replan loan on monthly cost change`.

Most loan plan / utilization / AI work is classified under **`financialItem`**
(same hooks touch `loanDetails` / `loanMonthlyCost` / `loanUtilization` as
secondaries).

**In use?** **Yes** via financialItem workload cluster — not orphaned.

---

### `category` / `categoryExample` — LIVE via transaction schedules

**Scheduled — 0** as primary (categorize schedule is under `transaction`).

**In use?** **Yes** through `Categorize transaction` + learn-example event.

---

### `email` / `attachment` / `statement` / `balanceSnapshot` — LIVE via financialItem email events + System Gmail

**Scheduled — 0** as primary.

**Event:** email/statement/attachment/balance hooks are primarily attributed to
**`financialItem`** above.

**System Gmail workloads** (`scheduler:gmail-poll`, `queue:gmail-jobs`,
`worker:gmail-*`, optional `pubsub:gmail-push-api`) feed the **`email`** ledger
then those hooks.

**In use?** **Yes** as a chain: System Gmail → `email` → financialItem email
hooks → `transaction` / `statement` / `attachment`.

---

### Insight write entities — LIVE as outputs (no own schedule primary)

| Entity | Dedicated scheduled workload as primary? | Written by |
| ------ | ---------------------------------------- | ---------- |
| `productInsight` | NONE (primary) | `Generate product insights` (under financialItem) |
| `spendingCategoryInsight` | NONE | `Generate spending category insights` (under portfolioSettings) |
| `monthlySpendingSummary` | NONE | Reconcile monthly spending (transaction) + evaluate/signals |
| `upcomingPaymentInsight` | NONE | `Generate upcoming payment insights` (paymentSchedule) |
| `merchantEnrichment` | NONE | `Enrich transactions` (transaction) |

**In use?** **Yes** as outputs. **No** standalone Scheduler workload id per
insight entity — correct (writers are the schedules above).

---

### `incomeDetails` / `investmentDetails` / `serviceDetails` — NONE as primary workload

| Entity | Dedicated hook workload (primary)? | Reality |
| ------ | ---------------------------------- | ------- |
| `incomeDetails` | **NONE** | Only appear inside financialItem AI-summary / portfolio income schedule |
| `investmentDetails` | **NONE** | Same |
| `serviceDetails` | **NONE** | Same |
| `loanMonthlyCost` | **NONE** as primary | Used inside financialItem loan-plan event hooks |
| `loanUtilization` | **NONE** as primary | Used inside financialItem utilization/replan hooks |

**In use as workloads?** **No dedicated `hook:*` rows.** They piggyback on
`financialItem` schedules/events. If you are hunting “workloads not in use,”
these entities do **not** add extra Scheduler load — they also don’t justify
extra pauseable workload rows.

---

## C. Matrix: entity → workload footprint

| Entity | Scheduled `hook:*` (primary) | Event hooks (primary) | System pipes | Verdict |
| ------ | ---------------------------- | --------------------- | ------------ | ------- |
| *(System)* | — | — | All queues/schedulers/gmail/AI | LIVE — required |
| `financialItem` | 8 | ~29 | gmail-jobs, hook-jobs | LIVE |
| `transaction` | 5 | ~6 | hook-jobs | LIVE |
| `paymentSchedule` | 3 | 0 primary | metrics engine | LIVE |
| `portfolioSettings` | 6 | 3 | ai-jobs (narratives) | LIVE |
| `spendingPattern` | 1 | 0 primary | — | LIVE |
| `account` | 0 | 1 | metrics via transaction | THIN workloads |
| `actor` | 0 | 1 | — | THIN |
| `loanDetails` | 0 | 1 | — | via financialItem |
| `category` / `categoryExample` | 0 | via transaction | — | via transaction |
| `email` / `attachment` / `statement` / `balanceSnapshot` | 0 | via financialItem + Gmail system | gmail-* | via chain |
| Insight entities (5) | 0 primary | writers above | — | outputs |
| `incomeDetails` / `investmentDetails` / `serviceDetails` | **0** | **0** primary | — | **NO dedicated workloads** |
| `loanMonthlyCost` / `loanUtilization` | **0** primary | via financialItem | — | secondary only |

---

## D. What looks “not in use” (workload lens)

1. **No orphan System control-plane workloads** in the cleaned registry (see
   inventory removed list: `ai-embed`, nightly memory HTTP, index Pub/Sub TF,
   etc. already gone). System Phase 1 reasonability matrix is in **Section A**.

2. **No scheduled `hook:*` with zero entity purpose** in the rates seed — every
   schedule maps to financialItem / transaction / paymentSchedule /
   portfolioSettings / spendingPattern. **Phase 2** re-judges each with
   reasonability (keep / merge / remove) in the tenant catalog.

3. **Entities with no primary workload rows**
   (`incomeDetails`, `investmentDetails`, `serviceDetails`): not unused
   *workloads* — they simply **don’t own** any. Cleanup question is entity
   schema, not Scheduler inventory.

4. **`hook:rates:Reset NEEDS_MANUAL to PENDING` — manual-only.** Natural cron
   is leap-day only (29 Feb); day-to-day use is ops force-run after catalog
   changes. Keep provisioned (near-zero schedule cost); do not treat as daily
   traffic.

5. **Gmail push** (`pubsub:gmail-push-api`, `worker:gmail-watch-renew`):
   provisioned, **inactive** under default poll — optional product path, not
   dead code. Product decision (keep vs retire) deferred to catalog cleanup.

6. **Aggregation pubsub**: off in dev workspace; on in staging/prod —
   environment gate, not unused.

7. **Portfolio narrative fan-out** — 7 nightly hooks writing to the same
   `portfolioSettings` singleton under different `narrativeVariant`s. Prime
   merge candidate for rates seed catalog cleanup (reasonability), not a
   platform code change.

---

## E. How this ties back to Platform → Workloads UI

```text
System
  scheduler:schedule-tick
       └─ runs due → hook:rates:Categorize transaction     } under transaction
                  → hook:rates:Mark overdue schedules      } under paymentSchedule
                  → hook:rates:Generate product insights   } under financialItem
                  → … 

  scheduler:gmail-poll → worker:gmail-poll → queue:gmail-jobs → …
       └─ eventually email / financialItem email event hooks
```

When filtering Workloads by domain in the UI (`ai` / `email` / `platform`),
you see **System** ids. When listing **scheduled data hooks**, you see
`hook:rates:…` — those are the **entity-split** rows in section B.

---

## F. Re-verify

```bash
# Scheduled hooks in seed
rg -l '"kind": "schedule"' .local/tenant-import/catalogs/data-hooks

# Hooks mentioning an entity
rg -l '"financialItem"' .local/tenant-import/catalogs/data-hooks
```

Registry static list:
[`packages/workload-registry/src/workload-registry.ts`](../../packages/workload-registry/src/workload-registry.ts).

---

## G. Full workload index (with entity / system chips)

Complete set of **static registry** workloads plus **scheduled** dynamic
`hook:rates:…` rows from the rates seed.

- **Parent** rows (`1`, `2`, …): the workload, its summary, and the full Used-by chip list.
- **Child** rows (`1.1`, `1.2`, …): only when the parent has **2+** Used-by chips. Workload blank; siblings with the same role/summary are merged. Single-chip parents have no children.

| # | Workload | Summary | Used by (chips) |
| - | -------- | ------- | --------------- |
| 1 | `queue:ai-jobs` | Cloud Tasks queue for async AI work: chat, UI builder, and record narrative refresh. | `system` `financialItem` `portfolioSettings` `productInsight` `upcomingPaymentInsight` `spendingCategoryInsight` |
| 1.1 |  | `system` — Shared Cloud Tasks pipe that rate-limits all async AI jobs. | `system` |
| 1.2 |  | Carries narrative-refresh tasks for entity AI summaries when enqueued (rates seed attribution). | `financialItem` `portfolioSettings` `productInsight` `upcomingPaymentInsight` `spendingCategoryInsight` |
| 2 | `queue:hook-jobs` | Cloud Tasks queue for queued after-hooks and long-running tenant deletion. | `system` |
| 3 | `queue:gmail-jobs` | Cloud Tasks queue for Gmail window sync, per-message processing, and watch renew. | `system` `financialItem` `attachment` `email` `statement` `transaction` |
| 3.1 |  | `system` — Shared Cloud Tasks pipe for all Gmail ingest fan-out. | `system` |
| 3.2 |  | `financialItem` — Carries ingest tasks that eventually match/link payments to financial items. | `financialItem` |
| 3.3 |  | `attachment` — Carries tasks that create or link statement/email attachments. | `attachment` |
| 3.4 |  | `email` — Feeds window-sync / process-message work that upserts the email ledger. | `email` |
| 3.5 |  | `statement` — Carries tasks that create statement records from Gmail content. | `statement` |
| 3.6 |  | `transaction` — Carries ingest tasks that create or update transactions from mail. | `transaction` |
| 4 | `scheduler:schedule-tick` | Every-minute Cloud Scheduler job that runs due scheduled data hooks across tenants and purges expired archives. | `system` `financialItem` `category` `categoryExample` `merchantEnrichment` `monthlySpendingSummary` `paymentSchedule` `portfolioSettings` `productInsight` `spendingCategoryInsight` `spendingPattern` `transaction` `upcomingPaymentInsight` |
| 4.1 |  | `system` — Platform control-plane / shared pipe for `scheduler:schedule-tick`. | `system` |
| 4.2 |  | Runs due scheduled hooks that touch the listed catalog entities. | `financialItem` `category` `categoryExample` `merchantEnrichment` `monthlySpendingSummary` `paymentSchedule` `portfolioSettings` `productInsight` `spendingCategoryInsight` `spendingPattern` `transaction` `upcomingPaymentInsight` |
| 5 | `scheduler:gmail-poll` | Every-5-minutes Cloud Scheduler job that polls connected Gmail mailboxes when delivery mode is poll. | `system` `email` |
| 5.1 |  | `system` — Cloud Scheduler trigger for the default poll delivery mode. | `system` |
| 5.2 |  | `email` — Polls mailboxes that land new rows in the email ledger path. | `email` |
| 6 | `pubsub:aggregation-events-worker` | Pub/Sub pull subscription that drives metric aggregation on worker-aggregation (on in staging/prod). | `system` |
| 7 | `pubsub:gmail-push-api` | Pub/Sub push subscription from Gmail watch to API; active only when delivery mode is push. | `system` `email` |
| 7.1 |  | `system` — Push subscription control plane for optional realtime Gmail delivery. | `system` |
| 7.2 |  | `email` — Delivers Gmail watch notifications that enqueue email ledger sync when mode is push. | `email` |
| 8 | `worker:process-data-hook` | HTTP handler for queued data-hook jobs from the hook-jobs queue. | `system` |
| 9 | `worker:schedule-tick` | HTTP target for schedule-tick; runs due cron hooks and archive purge in-process. | `system` `financialItem` `category` `categoryExample` `merchantEnrichment` `monthlySpendingSummary` `paymentSchedule` `portfolioSettings` `productInsight` `spendingCategoryInsight` `spendingPattern` `transaction` `upcomingPaymentInsight` |
| 9.1 |  | `system` — Platform control-plane / shared pipe for `worker:schedule-tick`. | `system` |
| 9.2 |  | Runs due scheduled hooks that touch the listed catalog entities. | `financialItem` `category` `categoryExample` `merchantEnrichment` `monthlySpendingSummary` `paymentSchedule` `portfolioSettings` `productInsight` `spendingCategoryInsight` `spendingPattern` `transaction` `upcomingPaymentInsight` |
| 10 | `worker:delete-tenant` | HTTP handler for async tenant archive and purge. | `system` |
| 11 | `worker:process-ai-chat` | HTTP handler that runs an async grounded AI chat job. | `system` |
| 12 | `worker:process-ai-ui-builder` | HTTP handler that runs an async AI UI builder job. | `system` |
| 13 | `worker:refresh-record-narrative` | HTTP handler that refreshes LLM narratives on AI record summaries. | `system` `financialItem` `portfolioSettings` `productInsight` `upcomingPaymentInsight` `spendingCategoryInsight` |
| 13.1 |  | `system` — Shared HTTP path for narrative refresh tasks from ai-jobs. | `system` |
| 13.2 |  | Refreshes LLM narrative text on entity AI summary docs (rates seed attribution). | `financialItem` `portfolioSettings` `productInsight` `upcomingPaymentInsight` `spendingCategoryInsight` |
| 14 | `worker:gmail-poll` | HTTP target for gmail-poll; enqueues a window sync per connected mailbox. | `system` `email` |
| 14.1 |  | `system` — HTTP face of the gmail-poll scheduler job. | `system` |
| 14.2 |  | `email` — Enqueues per-mailbox sync that updates the email ingest pipeline. | `email` |
| 15 | `worker:gmail-window-sync` | Syncs a time window of Gmail messages into the email ledger and fans out process-message tasks. | `system` `email` |
| 15.1 |  | `system` — HTTP unit of work for a mailbox time-window sync. | `system` |
| 15.2 |  | `email` — Lists matching Gmail messages and advances the mailbox watermark into the email ledger. | `email` |
| 16 | `worker:gmail-process-message` | Processes a single Gmail message (ingest / match / hook fan-out). | `system` `email` |
| 16.1 |  | `system` — HTTP unit of work for one Gmail message. | `system` |
| 16.2 |  | `email` — Upserts a single email ledger row and fans out match/create hooks. | `email` |
| 17 | `worker:gmail-watch-renew` | Renews Gmail users.watch subscriptions for push delivery mode. | `system` `email` |
| 17.1 |  | `system` — HTTP path to renew Gmail push watches. | `system` |
| 17.2 |  | `email` — Keeps push watches alive so new mail continues to reach the email ledger. | `email` |
| 18 | `inprocess:local-gmail-poll` | Local setInterval stand-in for Cloud Scheduler gmail-poll when IS_LOCAL=true. | `system` `email` |
| 18.1 |  | `system` — Local-only substitute for Cloud Scheduler. | `system` |
| 18.2 |  | `email` — Locally ticks the same poll path that fills the email ledger. | `email` |
| 19 | `inprocess:debounced-user-ai-memory` | In-memory ~5-minute debouncer that refreshes L2 user AI memory after record summary updates. | `system` |
| 20 | `inprocess:index-provisioner-queue` | In-process FIFO on the API that rate-limits Firestore composite index provisioning. | `system` |
| 21 | `hook:rates:Categorize transaction` | Every 2 hours: match PENDING txns to prior DONE txns by normalized description, then categoryExample embeddings (minScore 0.82). On miss, callAi (flash) picks a categoryId from the category catalog. | `transaction` `category` `categoryExample` |
| 21.1 |  | `transaction` — Primary target (actual money movement rows): Every 2 hours: match PENDING txns to prior DONE txns by normalized description, then… | `transaction` |
| 21.2 |  | Also reads related catalog entities while running this schedule. | `category` `categoryExample` |
| 22 | `hook:rates:Enrich transactions` | Every 3 hours: for DONE transactions missing merchantNormalized, look up (or create) a merchantEnrichment cache row keyed by normalizeMatchText(description). On cache miss, call Vertex for merchantNormalized / needType / consumptionType… | `transaction` `merchantEnrichment` |
| 22.1 |  | `transaction` — Primary target (actual money movement rows): Every 3 hours: for DONE transactions missing merchantNormalized, look up (or create) a… | `transaction` |
| 22.2 |  | `merchantEnrichment` — Also writes/updates related entities as part of this schedule. | `merchantEnrichment` |
| 23 | `hook:rates:Evaluate spending patterns` | Weekly (Monday 03:00 America/Bogota): for every active spendingPattern, compute expenseRatio / incomeRatio / categoryShare from monthlySpendingSummary + sibling patterns, then derive financialImpact / impactScore / optimizationPotential… | `spendingPattern` `monthlySpendingSummary` |
| 23.1 |  | `spendingPattern` — Primary target (spending pattern aggregates): Weekly (Monday 03:00 America/Bogota): for every active spendingPattern, compute expenseRatio /… | `spendingPattern` |
| 23.2 |  | `monthlySpendingSummary` — Also writes/updates related entities as part of this schedule. | `monthlySpendingSummary` |
| 24 | `hook:rates:Extend schedule horizon` | Monthly queued extension — top up paymentSchedule rows toward scheduleHorizonMonths. | `financialItem` `paymentSchedule` |
| 24.1 |  | `financialItem` — Primary target (financial commitments (loans, income, investments, services)): Monthly queued extension — top up paymentSchedule rows toward scheduleHorizonMonths. | `financialItem` |
| 24.2 |  | `paymentSchedule` — Also writes/updates related entities as part of this schedule. | `paymentSchedule` |
| 25 | `hook:rates:Generate domain AI summary text` | Nightly (03:00 America/Bogota): scheduled catch-up that enqueues a default recordNarrativeRefresh job (enqueueAiRecordNarrative) for ACTIVE income/investment/loan/service financial items, using the matching portfolioSettings.*AiPrompt… | `financialItem` `portfolioSettings` |
| 25.1 |  | `financialItem` — Primary target (financial commitments (loans, income, investments, services)): Nightly (03:00 America/Bogota): scheduled catch-up that enqueues a default recordNarrativeRefresh… | `financialItem` |
| 25.2 |  | `portfolioSettings` — Also uses related settings/signals context while running this schedule. | `portfolioSettings` |
| 26 | `hook:rates:Generate incomes portfolio AI summary text` | Nightly (04:00 America/Bogota): for the portfolioSettings singleton, rebuild the incomes rollup context (from the seeded income financialItems + settings) and upsert it into ai_record_summaries/{portfolioSettings__id} under… | `financialItem` `portfolioSettings` |
| 26.1 |  | `financialItem` — Primary target (financial commitments (loans, income, investments, services)): Nightly (04:00 America/Bogota): for the portfolioSettings singleton, rebuild the incomes rollup… | `financialItem` |
| 26.2 |  | `portfolioSettings` — Also uses related settings/signals context while running this schedule. | `portfolioSettings` |
| 27 | `hook:rates:Generate investments portfolio AI summary text` | Nightly (04:00 America/Bogota): for the portfolioSettings singleton, rebuild the investments rollup context (from the seeded investment financialItems + settings) and upsert it into ai_record_summaries/{portfolioSettings__id} under… | `financialItem` `portfolioSettings` |
| 27.1 |  | `financialItem` — Primary target (financial commitments (loans, income, investments, services)): Nightly (04:00 America/Bogota): for the portfolioSettings singleton, rebuild the investments… | `financialItem` |
| 27.2 |  | `portfolioSettings` — Also uses related settings/signals context while running this schedule. | `portfolioSettings` |
| 28 | `hook:rates:Generate loans portfolio AI summary text` | Nightly (04:00 America/Bogota): for the portfolioSettings singleton, rebuild the loans rollup context (from the seeded loan financialItems + settings) and upsert it into ai_record_summaries/{portfolioSettings__id} under narrativeVariant… | `financialItem` `portfolioSettings` |
| 28.1 |  | `financialItem` — Primary target (financial commitments (loans, income, investments, services)): Nightly (04:00 America/Bogota): for the portfolioSettings singleton, rebuild the loans rollup… | `financialItem` |
| 28.2 |  | `portfolioSettings` — Also uses related settings/signals context while running this schedule. | `portfolioSettings` |
| 29 | `hook:rates:Generate payments portfolio AI summary text` | Nightly (04:30 America/Bogota): for the portfolioSettings singleton, rebuild the payments rollup context from paymentsSignalsJson (+ settings / relationships) and upsert it into ai_record_summaries/{portfolioSettings__id} under… | `portfolioSettings` |
| 30 | `hook:rates:Generate portfolio AI summary text` | Nightly (05:00 America/Bogota): for the portfolioSettings singleton, rebuild the overall cross-domain context (metricsRollup composed from the four domain *AiSummaryJson blobs + relationships) and upsert it into… | `portfolioSettings` |
| 31 | `hook:rates:Generate portfolio payments signals` | Weekly (Monday 03:00 America/Bogota): for the portfolioSettings singleton, aggregate open paymentSchedule rows (UPCOMING/OVERDUE) into paymentsSignalsJson — dueNext7d, dueNext30d, overdueAmount, overdueCount, upcomingCount,… | `paymentSchedule` `portfolioSettings` |
| 31.1 |  | `paymentSchedule` — Primary target (installment / due-date schedule rows): Weekly (Monday 03:00 America/Bogota): for the portfolioSettings singleton, aggregate open… | `paymentSchedule` |
| 31.2 |  | `portfolioSettings` — Also uses related settings/signals context while running this schedule. | `portfolioSettings` |
| 32 | `hook:rates:Generate portfolio products signals` | Weekly (Monday 03:15 America/Bogota): for the portfolioSettings singleton, aggregate ACTIVE financialItem rows into productsSignalsJson — totalAssets, totalLiabilities, netWorth, activeCount, dormantCount, highUtilizationCount. Zero LLM. | `financialItem` `portfolioSettings` |
| 32.1 |  | `financialItem` — Primary target (financial commitments (loans, income, investments, services)): Weekly (Monday 03:15 America/Bogota): for the portfolioSettings singleton, aggregate ACTIVE… | `financialItem` |
| 32.2 |  | `portfolioSettings` — Also uses related settings/signals context while running this schedule. | `portfolioSettings` |
| 33 | `hook:rates:Generate portfolio spending signals` | Weekly (Monday 03:30 America/Bogota): for the portfolioSettings singleton, aggregate active spendingPattern rows for the current month (substring(now(), 0, 7)) plus monthlySpendingSummary totals into spendingSignalsJson —… | `portfolioSettings` `monthlySpendingSummary` `spendingPattern` |
| 33.1 |  | `portfolioSettings` — Primary target (portfolio AI settings and insight signal singleton): Weekly (Monday 03:30 America/Bogota): for the portfolioSettings singleton, aggregate active… | `portfolioSettings` |
| 33.2 |  | Also writes/updates related entities as part of this schedule. | `monthlySpendingSummary` `spendingPattern` |
| 34 | `hook:rates:Generate product insights` | Nightly (06:30 America/Bogota): for every ACTIVE financialItem, upsert one productInsight keyed by (month, financialItemId), write compressed metricsJson / impactScore / rank, then upsertAiRecordContext with narrativeVariant "insights"… | `financialItem` `portfolioSettings` `productInsight` |
| 34.1 |  | `financialItem` — Primary target (financial commitments (loans, income, investments, services)): Nightly (06:30 America/Bogota): for every ACTIVE financialItem, upsert one productInsight keyed by… | `financialItem` |
| 34.2 |  | `portfolioSettings` — Also uses related settings/signals context while running this schedule. | `portfolioSettings` |
| 34.3 |  | `productInsight` — Also writes/updates related entities as part of this schedule. | `productInsight` |
| 35 | `hook:rates:Generate products portfolio AI summary text` | Nightly (04:45 America/Bogota): for the portfolioSettings singleton, rebuild the products rollup context from productsSignalsJson (+ settings / relationships) and upsert it into ai_record_summaries/{portfolioSettings__id} under… | `portfolioSettings` |
| 36 | `hook:rates:Generate services portfolio AI summary text` | Nightly (04:00 America/Bogota): for the portfolioSettings singleton, rebuild the services rollup context (from the seeded service financialItems + settings) and upsert it into ai_record_summaries/{portfolioSettings__id} under… | `financialItem` `portfolioSettings` |
| 36.1 |  | `financialItem` — Primary target (financial commitments (loans, income, investments, services)): Nightly (04:00 America/Bogota): for the portfolioSettings singleton, rebuild the services rollup… | `financialItem` |
| 36.2 |  | `portfolioSettings` — Also uses related settings/signals context while running this schedule. | `portfolioSettings` |
| 37 | `hook:rates:Generate spending category insights` | Nightly (06:00 America/Bogota): for every active spendingPattern of the current month (substring(now(), 0, 7)) with financialImpact HIGH, upsert one spendingCategoryInsight keyed by (month, categoryId), write compressed metricsJson /… | `portfolioSettings` `spendingCategoryInsight` `spendingPattern` |
| 37.1 |  | `portfolioSettings` — Primary target (portfolio AI settings and insight signal singleton): Nightly (06:00 America/Bogota): for every active spendingPattern of the current month… | `portfolioSettings` |
| 37.2 |  | Also writes/updates related entities as part of this schedule. | `spendingCategoryInsight` `spendingPattern` |
| 38 | `hook:rates:Generate spending portfolio AI summary text` | Nightly (04:00 America/Bogota): for the portfolioSettings singleton, rebuild the spending rollup context from spendingSignalsJson (+ settings / relationships) and upsert it into ai_record_summaries/{portfolioSettings__id} under… | `portfolioSettings` |
| 39 | `hook:rates:Generate upcoming payment insights` | Nightly (06:15 America/Bogota): for every UPCOMING/OVERDUE paymentSchedule in the current month window, upsert one upcomingPaymentInsight keyed by (windowKey, financialItemId), write compressed metricsJson / impactScore / rank, then… | `paymentSchedule` `portfolioSettings` `upcomingPaymentInsight` |
| 39.1 |  | `paymentSchedule` — Primary target (installment / due-date schedule rows): Nightly (06:15 America/Bogota): for every UPCOMING/OVERDUE paymentSchedule in the current month… | `paymentSchedule` |
| 39.2 |  | `portfolioSettings` — Also uses related settings/signals context while running this schedule. | `portfolioSettings` |
| 39.3 |  | `upcomingPaymentInsight` — Also writes/updates related entities as part of this schedule. | `upcomingPaymentInsight` |
| 40 | `hook:rates:Mark overdue schedules` | Daily sweep — UPCOMING rows with dueDate before today become OVERDUE. | `paymentSchedule` |
| 41 | `hook:rates:Reconcile monthly spending` | Nightly (02:00 America/Bogota): for every active monthlySpendingSummary, recompute totalIncome / totalExpenses / transactionCount / incomeCount / expenseCount from transactions with matching month. Absorbs drift from updates/deletes… | `transaction` `monthlySpendingSummary` |
| 41.1 |  | `transaction` — Primary target (actual money movement rows): Nightly (02:00 America/Bogota): for every active monthlySpendingSummary, recompute totalIncome /… | `transaction` |
| 41.2 |  | `monthlySpendingSummary` — Also writes/updates related entities as part of this schedule. | `monthlySpendingSummary` |
| 42 | `hook:rates:Reconcile spending patterns` | Nightly (02:30 America/Bogota): for every active spendingPattern, recompute totalAmount / transactionCount / avgTicket from transactions with matching patternId. Absorbs drift from recategorization/re-enrichment that the incremental… | `transaction` `spendingPattern` |
| 42.1 |  | `transaction` — Primary target (actual money movement rows): Nightly (02:30 America/Bogota): for every active spendingPattern, recompute totalAmount /… | `transaction` |
| 42.2 |  | `spendingPattern` — Also writes/updates related entities as part of this schedule. | `spendingPattern` |
| 43 | `hook:rates:Reset NEEDS_MANUAL to PENDING` | One-shot (force only): flip all NEEDS_MANUAL transactions back to PENDING so Categorize can re-run after hook/catalog changes. Natural cron is leap-day only (29 Feb). | `transaction` |

_Total: 43 parent workloads (20 static + 23 scheduled hooks) and 78 entity/system child rows (siblings with the same role merged)._

**Chip legend:** `` `system` `` = platform control-plane / shared pipe;
`` `entityName` `` = tenant entity catalog model (**attribution** for who
currently uses the pipe in the rates seed — not a platform allowlist).
On parent rows, chips list everyone involved (primary first after `system`).
On child rows, Workload is blank. Single-chip children keep `` `entity` `` — summary; merged siblings share one summary with multiple chips. No children when the parent already has only one chip.
