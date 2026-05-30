# Routing module

Centralized route guards and navigation helpers for the web app.

## Guard stack

| Guard               | Used in           | Behavior                                                                                        |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `RequireAuth`       | Private layout    | Redirects to `/login` when unauthenticated                                                      |
| `RequireTenant`     | Tenant layout     | Superadmin without JWT `tenantId` → `/select-tenant`; members show loading while auto-bind runs |
| `RequireSuperAdmin` | Superadmin layout | Forbidden UI for non-superadmins (Platform routes)                                              |
| `PermissionGuard`   | Entity routes     | Shows forbidden UI when permission missing                                                      |

Layout hierarchy in [`routes.ts`](../routes.ts):

1. `/login` — public
2. `private-layout` — `RequireAuth` + sidebar for all authenticated routes
3. `superadmin-layout` — `RequireSuperAdmin` (`/settings/tenant`, `/settings/appearance`)
4. `tenant-layout` — `RequireTenant` (home, `/app/:entity` only)
5. Settings routes (`/settings/*`) — no tenant guard; all users operate on JWT `tenantId`

## Sidebar groups

[`useAccessibleNavItems.ts`](useAccessibleNavItems.ts):

- **Home** — `/`
- **Data Models** — dynamic entity links from catalog (`/app/:entity`)
- **Settings** — user management, roles, model builder, automation
- **Platform** (superadmin) — current tenant, appearance

## Entity routes

Entity pages use parametric routes from [`entity-routes.ts`](entity-routes.ts):

- `/app/:entity` — list with create/edit modals
- `/app/:entity/new` — redirects to `/app/:entity?create` (legacy)
- `/app/:entity/:id` — redirects to `/app/:entity?edit=:id` (legacy)

Unknown `:entity` values render the entity not-found page.

Create tenant opens a global modal (`CreateTenantModal` in private layout) from the tenant switcher or `/select-tenant`. `/platform/create-tenant` redirects to `/select-tenant` and opens the modal.

Entity routes call `useRefreshEntityCatalogOnMount` so Model Builder changes appear without a full reload.

## Tenant switching

**Superadmins** choose a tenant at `/select-tenant` or via the sidebar `TenantSwitcher`. Selection calls `POST /auth/select-tenant`, refreshes the ID token, and re-syncs permissions, `tenantRoleNames`, and tenant branding. Superadmins create new tenants from the switcher or select-tenant page via a modal.

**Tenant members** do not see tenant selection UI. On sign-in, the first available assigned tenant is auto-bound via `POST /auth/select-tenant`. The active tenant name appears in the user profile popover.

Branding from `tenantAppearance` is applied globally by [`TenantBrandingProvider`](../theme/TenantBrandingProvider.tsx). See [theme-and-tenant-branding-guide.md](../../../docs/theme-and-tenant-branding-guide.md).
