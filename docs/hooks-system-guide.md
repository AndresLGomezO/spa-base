# Hooks System Guide

Event-driven business logic for CRUD lifecycle events — **system hooks** (code) and **Data Hooks** (tenant-configurable automation stored in Firestore).

**Workstream:** [10.4 CUSTOM BUSINESS LOGIC (HOOKS)](<../Ecosystem%20Plan/v2/Key%20Capabilitues/10.4%20CUSTOM%20BUSINESS%20LOGIC%20(HOOKS).md>)

**Authoritative Data Hooks spec:** [data-hook-definition-json.md](./data-hook-definition-json.md)

---

## Event naming

Canonical format:

```
{entity}.{phase}{Operation}
```

| Event | When |
| --- | --- |
| `{entity}.beforeCreate` | Before POST validation/persist |
| `{entity}.afterCreate` | After successful create |
| `{entity}.beforeUpdate` | Before PUT persist |
| `{entity}.afterUpdate` | After successful update |
| `{entity}.beforeDelete` | After relation checks, before delete |
| `{entity}.afterDelete` | After successful delete |

Examples: `loan.beforeCreate`, `workItem.afterDelete`.

---

## Hook types

| Type | Source | Support |
| --- | --- | --- |
| System hooks | `defineModule({ hooks })` | Yes |
| Data Hooks (dynamic) | `POST /api/data-hooks` | Yes — primary tenant automation |
| Legacy static hooks | `hooks` collection | Migrated to `__data_hooks`; see migration in spec |
| Script hooks | Sandboxed `config.script` | Deferred |

---

## Execution semantics

| Phase | On failure | Mutations |
| --- | --- | --- |
| `before*` | Blocks CRUD (400) | May mutate `context.current` |
| `after*` | Logged; CRUD succeeds | Side effects via actions/services |

Relation validation runs before hook `beforeDelete`.

Data Hooks add:

- Expression-driven conditions and action values
- Opt-in chained dispatch (`chainHooks`) with depth/cycle guards
- Optional in-process deferred after-hooks (`execution: "deferred"`)

See [data-hook-definition-json.md §2](./data-hook-definition-json.md#2-execution-model) for full semantics.

---

## HookContext

```ts
{
  tenantId, entityName, event,
  current: Record<string, unknown>,
  previous?: Record<string, unknown>,
  user: { uid },
  depth?: number,
  visitedHookIds?: ReadonlySet<string>,
  services: {
    logger,
    entities: { create, update, list }, // RBAC-aware internal CRUD
  }
}
```

---

## Module hooks

```ts
defineModule({
  name: "workflows",
  hooks: [
    {
      event: "batch.afterDelete",
      order: 0,
      handler: async (ctx) => {
        ctx.services.logger?.info("Deleted batch", {
          id: ctx.current.id,
        });
      },
    },
  ],
});
```

Registered at bootstrap via `@repo/hooks` (`registerSystemHook`).

---

## Data Hooks (API)

Storage: `tenants/{tenantId}/__data_hooks/{hookId}`

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/data-hooks` | `hook.read` |
| GET | `/api/data-hooks/:id` | `hook.read` |
| POST | `/api/data-hooks` | `hook.create` |
| PATCH | `/api/data-hooks/:id` | `hook.update` |
| DELETE | `/api/data-hooks/:id` | `hook.delete` |
| PUT | `/api/data-hooks/catalog` | `hook.create` + `hook.update` + `hook.delete` |

Example create:

```json
{
  "name": "Set pending status",
  "entity": "loan",
  "phase": "before",
  "trigger": { "operation": "create" },
  "actions": [
    {
      "type": "setField",
      "field": "status",
      "value": { "kind": "literal", "value": "Pending" }
    }
  ],
  "enabled": true,
  "order": 0
}
```

Entity must exist in the tenant catalog. Full schema: [data-hook-definition-json.md](./data-hook-definition-json.md).

### Scheduled (time-based) hooks

Hooks with `trigger.kind: "schedule"` register on `{entity}.afterSchedule` and **do not** run on CRUD. Cloud Scheduler (or local curl) POSTs to worker-service `/tasks/schedule-tick` every minute; the worker scans all tenants, finds due cron hooks, and runs them via `runDataHook` using `SCHEDULED_HOOK_USER_UID` as the acting user. See [data-hook-definition-json.md §4](./data-hook-definition-json.md#4-triggers).

---

## Action types (Data Hooks)

| Action | Behavior |
| --- | --- |
| `setField` | Mutate trigger record (before: in place; after: service update) |
| `createRecord` | Create one related record |
| `createRecords` | Loop create (max 1,000) |
| `updateMatching` | Find and update related records (max 10,000 matches) |
| `sendNotification` | In-app bell for the acting user; optional browser push when enabled in Account → General |
| `callWebhook` | POST JSON to an HTTPS URL (optional expression-driven body) |

All values are expressions (JSON AST). Execution outcomes are persisted in `__data_hook_executions` when the runtime provides a log recorder.

---

## Permissions

| Permission | Purpose |
| --- | --- |
| `hook.read` | List/view hook definitions |
| `hook.create` | Create hooks |
| `hook.update` | Patch hooks |
| `hook.delete` | Delete hooks |

Tenant `admin` role (`*` grant) includes all hook permissions. Hook actions that call entity services enforce entity-level RBAC for the requesting user.

---

## Packages

| Package / path | Role |
| --- | --- |
| `@repo/hooks` | Event model, registry, `executeHooks`, expression engine, Data Hook interpreter |
| `@repo/modules` | Module hook registration via `loadApp()` |
| `@repo/firestore-converters` | `DataHookRepository` + in-memory impl |
| `@repo/gcp-firebase` | Firestore admin repository |
| `apps/api/src/hooks/` | API routes, runtime context, CRUD integration |
| `apps/api/src/crud/register-crud-routes.ts` | Lifecycle hook emission |

---

## Deferred

- Sandboxed script runner
- Email notification delivery (in-app + browser push already ship)
- System events (`user.login`, etc.)

---

## Related

- [browser-push-notifications.md](./browser-push-notifications.md) — web push architecture + deploy QA runbook
- [data-hook-definition-json.md](./data-hook-definition-json.md) — **full Data Hooks specification**
- [data-hooks.md](./data-hooks.md) — product overview
- [module-extension-guide.md](./module-extension-guide.md)
- [dynamic-entity-builder-guide.md](./dynamic-entity-builder-guide.md)
- [entity-system-guide.md](./entity-system-guide.md)
