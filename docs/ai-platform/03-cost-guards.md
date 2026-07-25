# 03 — Cost Guards (AI Spend Limits)

Tenant and role monthly caps on input tokens, output tokens, and estimated USD. Enforced on API enqueue and again inside `runAiRequest`.

Related: [Architecture](./01-architecture.md) · [Surfaces](./05-api-worker-ui.md) · [Integrating features](./06-integrating-new-features.md)

---

## Why this exists

Without a single gateway, each new insight / advice / benchmark feature would invent its own metering (or none). Cost guards assume:

> Every billable model call goes through `runAiRequest` with a correct `requestedBy`.

If you bypass the controller, **you break the stack’s cost model**.

---

## Limit sources

Schema: `packages/shared-types/src/tenant/ai-spend-limits.ts`

```ts
{
  monthlyInputTokens?: number;  // int ≥ 0
  monthlyOutputTokens?: number;
  monthlyBudgetUsd?: number;
}
```

Unset / empty object = **unlimited** for that meter.

| Source | Field | Editor |
|---|---|---|
| Tenant | `tenant.aiLimits` | `TenantAiLimitsEditor` (platform admin) |
| Role | `role.aiSpendLimits` | Role editor |

Role resolution: `resolveRoleAiSpendLimits(catalog, roleNames)` then `mergeStrictestAiSpendLimits` (minimum across roles = strictest).

Evaluation order in `assertAiSpendAllowed`:

1. Tenant meters against `ai_spend` period doc  
2. If user is attributable → role meters against `ai_spend_users` period doc  

First breached meter wins (`AiSpendLimitError` with `meter`).

---

## Period and storage

| Item | Value |
|---|---|
| Period key | UTC `YYYY-MM` (`aiSpendPeriodKey`) |
| Tenant doc | `tenants/{t}/ai_spend/period_YYYY-MM` |
| User doc | `tenants/{t}/ai_spend_users/{userId}_YYYY-MM` |
| Counters | `inputTokens`, `outputTokens`, `estimatedCostUsd`, `updatedAt` |

Increments use Firestore `FieldValue.increment` (Admin repo) or in-memory add (tests).

---

## Token / cost accounting

From `spendDeltaFromModelUsage`:

| Ledger field | From `AiJobModelUsage` |
|---|---|
| `inputTokens` | `promptTokens` |
| `outputTokens` | `candidatesTokens + thoughtsTokens` |
| `estimatedCostUsd` | `withEstimatedCost` via `pricing/model-prices.ts` |

Pricing tables must be updated when Vertex model SKUs change or USD estimates drift.

---

## Attribution rules

`isAttributableAiUserId(id)` → true only for non-empty ids **other than** `"system"`.

| Scenario | `requestedBy` | Tenant increment | User increment | Role check |
|---|---|---|---|---|
| Chat / UI builder / user refresh | Firebase UID | Yes | Yes | Yes |
| Nightly narrative, system hooks | `"system"` | Yes | No | No |
| Missing uid | empty | Yes | No | No |

**Do not** pass a fake user id for background work to “share” budget — that incorrectly burns personal caps.

---

## Enforcement points

### API (UX fast-fail)

`apps/api/src/ai/ai-spend-guard.ts`

- `assertAiSpendAllowedForRequest` — used before chat / UI builder / narrative refresh enqueue
- `getAiSpendStatusForUser` — `GET /api/ai/spend-status`

HTTP mapping: `replyWithAiSpendLimit` → **403**, code `ai.spend_limit` (`ApiErrorCode.AI_SPEND_LIMIT`), details include `meter`.

When permission context (`roleCatalog` / `tenantRoleNames`) is already loaded, the guard **must not** re-fetch Firestore user/role catalogs (avoids emulator/prod permission errors in tests and double reads).

### Worker (authoritative)

`createWorkerAiController` wires:

- `assertSpendAllowed` → same evaluate logic  
- `recordSpendUsage` → `recordAiSpendUsage` after success  

### Soft warn

`isSoftWarnRemaining`: remaining &lt; **10%** of a configured limit → `softWarn: true` on spend-status (UI banner) without blocking.

---

## UI behavior

| Piece | Path |
|---|---|
| Query hook | `apps/web/app/features/ai-spend/use-ai-spend-status.ts` |
| Action guard | `apps/web/app/features/ai-spend/use-ai-spend-action-guard.ts` |
| Notice (bottom-right, closable) | `apps/web/app/features/ai-spend/notify-ai-spend-limit.tsx` |
| Consumers | Chat, form/list AI controls, summary refresh |

Notices appear **only when an AI action is triggered** (or the API returns `ai.spend_limit`), not on page load.

Presentation is a soft closable **allowance bubble** (bottom-right) — calm AI chrome, not a red error alert.

When `blocked` at trigger time:

- Show the allowance-used bubble and **do not** start the job

When `softWarn` at trigger time:

- Show the nearing-allowance bubble and **allow** the action

API `ai.spend_limit` errors also open the allowance-used bubble (never surface the raw API error string as a destructive Alert).


---

## Status DTO

Built by `buildAiSpendStatus` (`spend/status.ts`): period, limits, used, remaining, `blocked`, `softWarn`, limiting meter metadata.

Clients: `getAiSpendStatus()` in `apps/web/app/lib/api-client.ts`.

Permission to read status: `ai.chat.read` **or** `ai.uiBuilder.read`.

---

## Adding a new billable feature

Checklist:

1. Register `AiFeature` + run permission.
2. Call `runAiRequest` with that feature and correct `requestedBy`.
3. If user-enqueueable from API: call `assertAiSpendAllowedForRequest` before creating the parent job / Cloud Task.
4. If UI can start it: gate with `useAiSpendStatus().blocked` + banner.
5. Decide attribution (`system` vs UID) deliberately.
6. Add API test for over-limit 403 if there is an HTTP enqueue path.

You do **not** need a separate spend collection per feature. Per-feature sub-budgets are explicitly **out of scope** today; use role/tenant caps or separate tenants if needed.

---

## Common pitfalls

| Mistake | Effect |
|---|---|
| Calling Vertex outside controller | Unmetered spend; jobs missing |
| Using UID for cron jobs | Users hit caps from background work |
| Skipping API guard | Worker still blocks, but UX shows generic 500/failed job |
| Swallowing `AiSpendLimitError` into 500 | Breaks clients expecting `ai.spend_limit` |
| Forgetting pricing entry for new model id | `estimatedCostUsd` understated |
