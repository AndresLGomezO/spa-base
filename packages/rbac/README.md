# @repo/rbac

Permission-based role access control for the platform.

## Concepts

| Concept           | Description                                         |
| ----------------- | --------------------------------------------------- |
| **Permission**    | Concrete action on a resource, e.g. `customer.read` |
| **Role**          | Named grant list with wildcard support              |
| **Platform role** | Global role (e.g. superadmin bypass)                |
| **Tenant role**   | Role scoped to one tenant via `users/{uid}.tenants` |

Permissions are generated automatically per entity in `@repo/entities` / `@repo/shared-types`.

## Built-in roles

| Role     | Grants                           |
| -------- | -------------------------------- |
| `admin`  | `*` (all permissions)            |
| `editor` | `*.read`, `*.create`, `*.update` |
| `viewer` | `*.read`                         |

## Wildcards

| Pattern      | Matches                              |
| ------------ | ------------------------------------ |
| `*`          | All known permissions                |
| `customer.*` | All customer permissions             |
| `*.read`     | All read permissions across entities |

Known permissions are aggregated in `ALL_KNOWN_PERMISSIONS` from entity exports in `@repo/shared-types`. Add new entity permissions there when introducing entities.

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

hasPermission("customer.create", permissions); // true
hasPermission("customer.delete", permissions); // false
```

Fastify enforcement lives in `apps/api/src/rbac/` — not in this package.

## Web

The API returns resolved permissions from `GET /auth/validate`. The web app stores them in auth context and exposes `usePermission("customer.read")` for WS5 UI gating.

## Related

- [Entity system guide](../../docs/entity-system-guide.md)
- [API RBAC wiring](../../apps/api/src/rbac/)
- [Workstream spec](<../../Ecosystem%20Plan/v1/workstreams/RBAC%20SYSTEM%20(PERMISSION-BASED).md>)
