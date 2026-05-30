# @repo/rbac

Permission-based role access control for the platform.

## Concepts

| Concept           | Description                                         |
| ----------------- | --------------------------------------------------- |
| **Permission**    | Concrete action on a resource, e.g. `loan.read`     |
| **Role**          | Named grant list with wildcard support              |
| **Platform role** | Global role (e.g. superadmin bypass)                |
| **Tenant role**   | Role scoped to one tenant via `users/{uid}.tenants` |

Tenant role **definitions** live at `tenants/{tenantId}/roles/{roleId}`. Global templates at `roles/{name}` (`tenantId: null`) are seed-only. See [docs/advanced-rbac-guide.md](../../docs/advanced-rbac-guide.md).

Permissions are generated automatically per entity in `@repo/entities` / `@repo/shared-types`.

## Built-in roles

Built-in roles are seeded into Firestore `roles/{roleId}` on API startup (idempotent). `resolvePermissions` loads the Firestore catalog first and falls back to in-code definitions:

| Role     | Grants                           |
| -------- | -------------------------------- |
| `admin`  | `*` (all permissions)            |
| `editor` | `*.read`, `*.create`, `*.update` |
| `viewer` | `*.read`                         |

Use `buildRoleCatalog(firestoreRoles)` to merge Firestore documents with built-in fallback. Pass the catalog via `resolvePermissions(input, { roleCatalog })`.

## Wildcards

| Pattern  | Matches                              |
| -------- | ------------------------------------ |
| `*`      | All known permissions                |
| `loan.*` | All loan permissions                 |
| `*.read` | All read permissions across entities |

Wildcard grants are **expanded at resolve time** via `expandGrants(grants, knownPermissions)`. The `knownPermissions` list must include every permission that should match — static entity permissions from `@repo/entities`, plus tenant-specific dynamic entity permissions after definitions are loaded. If the catalog is incomplete, patterns like `loan.*` expand to nothing while exact grants such as `loan.read` may still resolve (passthrough).

Use `getAllKnownPermissions(tenantId)` or the API’s `prepareKnownPermissions` helper (loads tenant definitions, then aggregates permissions) before calling `resolvePermissions`. Runtime checks should use `hasPermission(required, resolvedPermissions)` on the **expanded** list returned to clients, not raw role grant strings.

Known permissions are aggregated in `getAllKnownPermissions()` / `ALL_KNOWN_PERMISSIONS` from entity exports and dynamic tenant definitions.

## User role storage

Firestore document `users/{uid}`:

```json
{
  "platformRole": "superadmin",
  "tenants": {
    "tenant_a": ["admin"],
    "tenant_b": ["viewer"]
  }
}
```

- `platformRole: "superadmin"` or `"platform.superadmin"` bypasses all checks
- Permissions are evaluated **within tenant context** (from JWT `tenantId` claim)
- **Deny by default** — users without roles for the active tenant get no permissions

### Superadmin bootstrap (WS7)

On first user creation, emails in `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` (comma-separated, API env) receive `platformRole: "platform.superadmin"`. Existing users are never promoted or demoted on later logins. Do not hardcode production emails in source — use deployment secrets only.

## API

```ts
import {
  resolvePermissions,
  hasPermission,
  isPlatformSuperAdmin,
} from "@repo/rbac";

const permissions = resolvePermissions({
  platformRole: null,
  tenants: { tenant_a: ["editor"] },
  tenantId: "tenant_a",
});

hasPermission("loan.create", permissions); // true
hasPermission("loan.delete", permissions); // false
```

Fastify enforcement lives in `apps/api/src/rbac/` — not in this package.

## Field-level permissions (Phase B)

```ts
import {
  resolveFieldAccessMap,
  filterFields,
  assertWritableFields,
  buildTenantRoleCatalog,
} from "@repo/rbac";
```

Roles may include optional `fieldRules` per entity. Multiple roles merge with most-permissive union per field (`write` > `read` > `none`).

## Web

The API returns **expanded** permissions from `GET /auth/validate`. The web app stores them in auth context and exposes `usePermission("loan.read")`, which delegates to `hasPermission` from this package.

## Related

- [Advanced RBAC guide](../../docs/advanced-rbac-guide.md)
- [Entity system guide](../../docs/entity-system-guide.md)
- [API RBAC wiring](../../apps/api/src/rbac/)
- [master-plans.md](../../docs/master-plans.md)
