# Advanced RBAC Guide (Phase B)

This guide covers tenant-scoped roles and field-level permissions delivered in Phase B of capability **10.5 Advanced RBAC**.

## Overview

Phase B adds:

- Tenant role definitions at `tenants/{tenantId}/roles/{roleId}`
- Field-level permissions on roles (`fieldRules`)
- Server-side field filtering on CRUD responses
- Write validation on POST/PATCH
- UI Builder hide/disable wiring
- Role Manager UI at `/settings/roles`

**Out of scope (Phase C+):** ABAC conditions, query auto-filters, custom actions, role hierarchy.

## Storage model

| Location | Purpose |
|----------|---------|
| `roles/{name}` (`tenantId: null`) | Global templates — seed-only |
| `tenants/{tenantId}/roles/{roleId}` | Tenant roles — runtime source of truth |
| `users/{uid}.tenants` | Role name assignments per tenant |

Global templates are copied into tenant subcollections when a tenant is created (`seedTenantRolesFromTemplates`).

Built-in roles (`admin`, `editor`, `viewer`) are seeded per tenant with doc IDs matching the role name.

## Permission strings

Entity-level grants remain wildcard strings:

```text
loan.read
loan.create
*.read
*
```

Role management permissions:

```text
role.read
role.create
role.update
```

Entity list Card/Table layout (view settings on entity pages) requires `entityUiOverride.update`, or tenant built-in **admin** / platform superadmin. Entity-level grants such as `account.update` or the global `*.update` wildcard do **not** unlock layout changes.

## Field permission semantics

Each role may include `fieldRules`:

```json
{
  "resource": "loan",
  "fields": [
    { "field": "internalNotes", "access": "none" },
    { "field": "amount", "access": "read" }
  ]
}
```

Access levels: `write`, `read`, `none`.

| Case | Behavior |
|------|----------|
| Superadmin | All fields `write` |
| No entity grant | All fields `none` |
| Entity grant, no field rules | Fields inherit entity level |
| Explicit field rule | Rule applies; unlisted fields inherit entity level |
| Multiple roles | Most permissive union: `write` > `read` > `none` |

System fields (`id`, `tenantId`, `createdAt`, `updatedAt`) are excluded from field rules.

## API routes

| Method | Route | Permission |
|--------|-------|------------|
| GET | `/api/roles` | `role.read` |
| GET | `/api/roles/:id` | `role.read` |
| POST | `/api/roles` | `role.create` |
| PATCH | `/api/roles/:id` | `role.update` |

Superadmin may pass `?tenantId=` to target another tenant.

Built-in roles: grants cannot be changed via PATCH; field rules and description can.

## CRUD enforcement

- **GET list / GET by id:** `filterFields` removes fields with `none` access
- **POST / PATCH:** `assertWritableFields` rejects bodies containing `read` or `none` fields (400 with field errors)
- **Hooks internal services:** same field access checks for after-hook create/update

## Entity catalog

`GET /api/entities` includes optional `fieldAccess` per entity for the current user (non-superadmin). The web app uses this to hide/disable fields via `@repo/ui-builder` permission helpers.

## Web UI

| Route | Access |
|-------|--------|
| `/settings/roles` | `role.read` |
| `/settings/admin/roles` | Superadmin cross-tenant |

Components: `RoleManager`, `RoleEditor`, `FieldPermissionEditor` under `apps/web/app/components/roles/`.

## Package surface

| Package | Key exports |
|---------|-------------|
| `@repo/rbac` | `resolveFieldAccessMap`, `filterFields`, `assertWritableFields`, `buildTenantRoleCatalog`, tenant role schemas |
| `apps/api` | `/api/roles`, tenant-aware role catalog loader, CRUD field enforcement |

## Phase C extension points

- `RbacQueryInjector` in `@repo/query-engine` — record-level ABAC filters
- `Condition` evaluator on structured permissions
- Visual condition builder in admin UI

## Related docs

- [packages/rbac/README.md](../packages/rbac/README.md)
- [docs/firestore-collections-guide.md](./firestore-collections-guide.md)
- [docs/hooks-system-guide.md](./hooks-system-guide.md)
