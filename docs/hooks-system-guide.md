# Hooks System Guide

Event-driven business logic for CRUD lifecycle events — module hooks (code) and tenant dynamic hooks (action-based, stored in Firestore).

**Workstream:** [10.4 CUSTOM BUSINESS LOGIC (HOOKS)](<../Ecosystem%20Plan/v2/Key%20Capabilitues/10.4%20CUSTOM%20BUSINESS%20LOGIC%20(HOOKS).md>)

---

## Event naming

Canonical format (Answer Q hybrid):

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

Examples: `loan.beforeCreate`, `organization.afterDelete`.

---

## Hook types

| Type | Source | v1 support |
| --- | --- | --- |
| System hooks | `defineModule({ hooks })` | Yes |
| Dynamic hooks | `POST /api/hooks` (action config) | Yes |
| Script hooks | Sandboxed `config.script` | Deferred |

---

## Execution semantics

| Phase | On failure | Mutations |
| --- | --- | --- |
| `before*` | Blocks CRUD (400) | May mutate `context.current` |
| `after*` | Logged; CRUD succeeds | Side effects via actions/services |

Relation validation runs before hook `beforeDelete`.

---

## HookContext

```ts
{
  tenantId, entityName, event,
  current: Record<string, unknown>,
  previous?: Record<string, unknown>,
  user: { uid },
  services: {
    logger,
    entities: { create, update }, // RBAC-aware internal CRUD
  }
}
```

---

## Module hooks

```ts
defineModule({
  name: "inventory",
  hooks: [
    {
      event: "organization.afterDelete",
      order: 0,
      handler: async (ctx) => {
        ctx.services.logger?.info("Deleted org", {
          id: ctx.current.id,
        });
      },
    },
  ],
});
```

Registered at bootstrap via `@repo/hooks` (`registerSystemHook`).

---

## Dynamic hooks (API)

Storage: `tenants/{tenantId}/hooks/{hookId}`

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/hooks` | `hook.read` |
| POST | `/api/hooks` | `hook.create` |
| GET | `/api/hooks/:id` | `hook.read` |
| PATCH | `/api/hooks/:id` | `hook.update` |

Example create:

```json
{
  "name": "Set pending status",
  "entity": "loan",
  "event": "loan.beforeCreate",
  "type": "action",
  "config": {
    "actions": [
      { "type": "updateField", "field": "status", "value": "Pending" }
    ]
  }
}
```

Entity must exist in the tenant catalog (static + dynamic entities).

---

## Action types (v1)

| Action | Behavior |
| --- | --- |
| `updateField` | Mutate `current` in before-hooks; internal update in after-hooks |
| `createRecord` | Create related record via RBAC-checked internal CRUD |
| `sendNotification` | Log stub (no real notification infra yet) |
| `callWebhook` | Not supported in v1 |

---

## Permissions

| Permission | Purpose |
| --- | --- |
| `hook.read` | List/view hook definitions |
| `hook.create` | Create hooks |
| `hook.update` | Patch hooks |

Tenant `admin` role (`*` grant) includes all hook permissions. Hook actions that call `createRecord` / `updateField` in after-hooks enforce entity-level RBAC for the requesting user.

---

## Packages

| Package / path | Role |
| --- | --- |
| `@repo/hooks` | Event model, registry, `executeHooks`, action interpreter |
| `@repo/modules` | Module hook registration via `loadApp()` |
| `@repo/firestore-converters` | `HookRepository` + in-memory impl |
| `@repo/gcp-firebase` | Firestore admin repository |
| `apps/api/src/hooks/` | API routes, runtime context, CRUD integration |
| `apps/api/src/crud/register-crud-routes.ts` | Lifecycle hook emission |

---

## Deferred (Phase C)

- Sandboxed script runner
- Hook Builder admin UI
- Execution logs in Firestore
- Async queue for after-hooks
- `callWebhook` action
- System events (`user.login`, etc.)

---

## Related

- [Module Extension Guide](./module-extension-guide.md)
- [Dynamic Entity Builder Guide](./dynamic-entity-builder-guide.md)
- [Entity System Guide](./entity-system-guide.md)
