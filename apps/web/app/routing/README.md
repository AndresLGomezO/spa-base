# Routing module

Centralized route guards and navigation helpers for the web app.

## Guard stack

| Guard             | Used in                     | Behavior                                                                                                          |
| ----------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `RequireAuth`     | Auth-only + private layouts | Redirects to `/login` when unauthenticated                                                                        |
| `RequireTenant`   | Private layout              | Redirects to `/select-tenant` when JWT has no `tenantId`; superadmin with zero tenants may access platform routes |
| `PermissionGuard` | Entity routes               | Shows forbidden UI when permission missing                                                                        |

Layout hierarchy in [`routes.ts`](../routes.ts):

1. `/login` — public
2. `auth-only-layout` — `RequireAuth` only (`/select-tenant`, `/settings/admin`)
3. `private-layout` — `RequireAuth` + `RequireTenant` (home, entities, settings)

## Entity routes

Entity pages use parametric routes from [`entity-routes.ts`](entity-routes.ts):

- `/app/:entity` — list
- `/app/:entity/new` — create
- `/app/:entity/:id` — edit

Unknown `:entity` values render the entity not-found page.

## Sidebar navigation

[`useAccessibleNavItems.ts`](useAccessibleNavItems.ts) builds nav items from [`entity-catalog.ts`](../entities/entity-catalog.ts), filtering entities by `{entity}.read` permission.

## Adding a new entity

1. Register in [`entity-catalog.ts`](../entities/entity-catalog.ts)
2. Add `nav.{entity}` i18n keys (en + es)
3. No route changes needed — parametric routes pick up new catalog entries automatically

## Tenant switching

Users with multiple tenants in Firestore `users/{uid}.tenants` can select a tenant at `/select-tenant` or via the sidebar `TenantSwitcher`. Selection calls `POST /auth/select-tenant`, refreshes the ID token, and re-syncs permissions.
