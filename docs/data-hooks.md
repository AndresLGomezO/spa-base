# Data Hooks (Automation)

Data Hooks are the tenant-configurable automation engine. Admins define logic that
runs automatically when entity records are **created**, **updated**, or **deleted**
— without writing code.

The feature lives under **Automation** in the sidebar (one entry per entity). Each
entity page has a hook list on the left and a definition editor on the right.

## Authoritative specification

**[data-hook-definition-json.md](./data-hook-definition-json.md)** is the
self-contained reference for authoring hooks. It covers triggers, conditions,
actions, the full expression language, portable JSON envelopes, API, execution
semantics (including chaining and deferred mode), and copy-paste cookbook examples.

Read that document to implement any supported automation hook.

## At a glance

| Concept | Summary |
|---------|---------|
| **Trigger** | CRUD (`create` / `update` / `delete`) or **schedule** (cron + timezone); optional `updateFields` on update |
| **Phase** | `before` (mutate in place, blocks on error) or `after` (side effects, CRUD succeeds) |
| **Condition** | Optional AND/OR boolean tree on trigger record fields |
| **Actions** | `setField`, `createRecord`, `createRecords`, `updateMatching`, `deleteMatching`, `deleteRecord`, `getRecord`, `getOrCreateRecord`, `matchRelatedRecord`, `aggregateMatching`, `sendNotification`, `callWebhook` |
| **Expressions** | JSON AST with 27 functions plus a **`switch`** lookup node — no I/O during eval; related data via prior load actions + `loaded`, aggregates via `aggregateMatching` + `aggregate` field source |
| **Chaining** | Opt-in via `chainHooks: true`; depth and cycle guards |
| **Import** | Single-definition or catalog JSON envelopes |

## API

Base path `/api/data-hooks` — see the [spec §9](./data-hook-definition-json.md#9-api-and-permissions)
for routes and permissions.

Storage: per-tenant `__data_hooks` collection, loaded lazily into the runtime registry.

## Phasing

- **Phase 1** — triggers, conditions, `setField`, expression arithmetic + date functions.
- **Phase 2** — cross-entity actions, boolean condition trees, catalog import/export + seed.
- **Phase 3** — opt-in chained hooks, additional text/conditional functions, in-process deferred after-hooks.
- **Phase 4** — authoritative specification document ([data-hook-definition-json.md](./data-hook-definition-json.md)).
- **Phase 5** — durable async after-hooks via Cloud Tasks (`execution: "queued"`) → worker-service; in-process `deferred` retained for local/simple cases.
- **Phase 6** — Firestore execution logs + `callWebhook` action (URL + optional JSON body).
- **Phase 7** — Visual expression builder for binary, unary, and call AST nodes in the Automation UI (Advanced JSON retained as fallback).
- **Phase 8** — Compound `updateMatching.where` (AND/OR condition tree with indexed lookup + post-filter).
- **Phase 9** — `deleteMatching` and `deleteRecord` actions (after phase, RBAC + chaining).
- **Phase 10** — `getRecord` action and `loaded` expression field source (read related records into scope without expression I/O).
- **Phase 11** — `aggregateMatching` action (`count` / `sum` / `min` / `max` / `avg`) and `aggregate` expression field source (generic reductions over matching records).
- **Phase 12** — Scheduled/time-based triggers (`trigger.kind: "schedule"`) with cron + timezone, worker `/tasks/schedule-tick` orchestrator, scopes `once` (batch) and `eachRecord` (per-row fan-out).
- **Phase 13** — `switch` expression AST node for flat key→value lookups (avoids deeply nested `if` trees that hit Firestore document depth limits); visual Switch panel in the expression builder.
- **Phase 14** — Array literals in condition `in`/`notIn` values (flat scalar lists, max 32 items); condition editor array UI; validation restricts arrays to those operators.
- **Phase 15** — `createRecords` tiered limits (`MAX_CREATE_RECORDS` / `MAX_CREATE_RECORDS_QUEUED`), optional `startIndex` for rolling-horizon generation, authoring validation, and UI hints.
- **Phase 16** — PLAT-08 doc closure (no `list` action); Rates catalog modernization (FI-02, FI-04, TX-04, PS-01, cascade delete, LD flat plan).

## Related

- [hooks-system-guide.md](./hooks-system-guide.md) — dispatch architecture (system + dynamic hooks)
- [entity-definition-json.md](./entity-definition-json.md) — entity schemas hooks reference
- [data-hooks-platform-gaps.md](./data-hooks-platform-gaps.md) — open platform gaps
- [rates-data-hooks-gap-analysis.md](./rates-data-hooks-gap-analysis.md) — Rates tenant automation backlog (example domain)
