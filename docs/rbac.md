# RBAC

Role-based access control uses **composable slices** merged into a single product registry.

| Package | Responsibility |
|---------|----------------|
| `@repo/rbac-core` | `defineRbacSlice`, `mergeRbacSlices` / `createRbacContext`, registry helpers |
| `@repo/rbac-base` | Platform slice: `admin`, `member`, base permissions |
| `@repo/rbac-app` | **Product registry** — merges slices; export `APP_RBAC`, `Permission`, `AppRole`, `hasPermission` |
| `@repo/shared-types` | Firestore user schema (`role` as string; validated at runtime) |
| `apps/api` | Enforces permissions; syncs Firebase custom claims |
| `apps/web` | UX-only gates via `@repo/rbac-app` |

The web app must **not** import `@repo/rbac-core`, `@repo/rbac-base`, or module slice packages directly. Authorization is enforced server-side.

## Roles (platform)

| Role | Weight | Description |
|------|--------|-------------|
| `admin` | 100 | Superadmin — all permissions from every merged slice |
| `member` | 10 | Limited platform access |

This repo also merges `@repo/rbac-example` (`demo_viewer`) to demonstrate multi-slice composition. Set `INCLUDE_EXAMPLE_RBAC_SLICE=false` to omit it.

## Permissions (platform)

| Permission | admin | member |
|------------|:-----:|:------:|
| `user:view_self` | yes | yes |
| `user:update_self` | yes | yes |
| `user:view_all` | yes | no |
| `user:update_all` | yes | no |
| `team:view` | yes | yes |
| `team:manage` | yes | no |
| `billing:view` | yes | yes |
| `billing:manage` | yes | no |
| `role:assign` | yes | no |

## Data flow

1. User signs in with Firebase Auth.
2. Web calls `GET /auth/validate` to upsert `users/{uid}` in Firestore.
3. Firestore stores `role` (string) and `lastClaimsSyncAt`.
4. API validates `role` against `APP_RBAC` and syncs `{ role }` to custom claims when they drift.
5. Web reads role from the validate response and JWT claims.
6. Protected API routes use `jwt-auth` + `requirePermission`.
7. Web routes/nav use `PermissionGate` / `usePermission` for UX gating only.

## Bootstrap admin

```bash
API_BOOTSTRAP_ADMIN_EMAILS=you@example.com,other@example.com
```

First upsert for a matching email receives `role: "admin"`. Other new users default to `member`.

## Adding a module slice

### 1. Create a slice package

```typescript
// packages/rbac-billing/src/slice.ts
import { defineRbacSlice } from "@repo/rbac-core";

export const billingRbacSlice = defineRbacSlice({
  id: "billing",
  permissions: [
    "billing.invoice.read",
    "billing.invoice.create",
  ] as const,
  roles: {
    billing_viewer: {
      weight: 20,
      permissions: ["billing.invoice.read"],
    },
  },
  roleLabels: {
    billing_viewer: "Billing viewer",
  },
});
```

**Naming:** `{module}.{resource}.{action}` (dot-separated) for module permissions. Platform slice keeps colon style (`user:view_self`) for backward compatibility.

### 2. Merge in `packages/rbac-app`

```typescript
import { mergeRbacSlices } from "@repo/rbac-core";
import { baseRbacSlice } from "@repo/rbac-base";
import { billingRbacSlice } from "@repo/rbac-billing";

export const APP_RBAC = mergeRbacSlices(baseRbacSlice, billingRbacSlice);
```

Extend exported `Permission` and `AppRole` unions when you add slices.

### 3. Use in API and web

```typescript
import { hasPermission, type Permission } from "@repo/rbac-app";

requirePermission("billing.invoice.read");
```

Hierarchy (`canManageRole`, `canAssignRole`) comes from `APP_RBAC` — use only in the API.

### Rules

- Modules must **not** import each other's slices; only `rbac-app` merges.
- Do not edit `@repo/rbac-base` from product modules — add a new slice.
- Firestore `users.role` is a string; validate with `isUserRole()` from `@repo/rbac-app`.

## API routes

| Route | Auth | Notes |
|-------|------|-------|
| `GET /auth/validate` | Bearer + App Check | Upserts user, syncs claims, returns role |
| `PATCH /users/:uid/role` | Bearer + `role:assign` | Updates Firestore role and custom claims |

## Phase 2 (contextual RBAC)

See [rbac-phase2.md](./rbac-phase2.md) for tenant/module role assignments when a product needs multiple roles per user.
