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
| **Trigger** | One entity + one operation (`create` / `update` / `delete`); optional `updateFields` on update |
| **Phase** | `before` (mutate in place, blocks on error) or `after` (side effects, CRUD succeeds) |
| **Condition** | Optional AND/OR boolean tree on trigger record fields |
| **Actions** | `setField`, `createRecord`, `createRecords`, `updateMatching`, `sendNotification` |
| **Expressions** | JSON AST with 27 functions — no I/O, deterministic evaluation |
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

## Related

- [hooks-system-guide.md](./hooks-system-guide.md) — dispatch architecture (system + dynamic hooks)
- [entity-definition-json.md](./entity-definition-json.md) — entity schemas hooks reference
- [rates-data-hooks-gap-analysis.md](./rates-data-hooks-gap-analysis.md) — Rates tenant automation inventory and platform gaps (example domain)
