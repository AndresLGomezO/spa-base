# Routing module

Centralized route guards and navigation helpers for the web app.

## Guard stack

| Guard               | Used in           | Behavior                                                                                      |
| ------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `RequireAuth`       | Private layout    | Redirects to `/login` when unauthenticated                                                    |
| `RequireTenant`     | Tenant layout     | No JWT `tenantId` → loading while first tenant auto-binds; zero tenants → empty state in main |
| `RequireSuperAdmin` | Superadmin layout | Forbidden UI for non-superadmins (Platform routes)                                            |
| `PermissionGuard`   | Entity routes     | Shows forbidden UI when permission missing                                                    |

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
- **Data structure** — model builder, entity categories (`/settings/data-models`, `/settings/entity-categories`)
- **Settings** — user management, roles, automation
- **Platform** (superadmin) — current tenant, appearance

## Entity routes

Entity pages use parametric routes from [`entity-routes.ts`](entity-routes.ts):

- `/app/:entity` — list with create/edit modals
- `/app/:entity/new` — redirects to `/app/:entity?create` (legacy)
- `/app/:entity/:id` — redirects to `/app/:entity?edit=:id` (legacy)

Unknown `:entity` values render the entity not-found page.

Create tenant opens a global modal (`CreateTenantModal` in private layout) from the tenant switcher or the no-tenants empty state. `/platform/create-tenant` redirects to `/` and opens the modal. Legacy `/select-tenant` redirects to `/`.

Entity routes call `useRefreshEntityCatalogOnMount` so Model Builder changes appear without a full reload.

## Tenant switching

**All users** without a JWT `tenantId` auto-bind to the first available tenant via `POST /auth/select-tenant` on sign-in. **Superadmins** switch tenants via the sidebar `TenantSwitcher` or create new tenants from the switcher or empty-state modal.

When no tenants exist, the sidebar shows **Home** only and the main area shows a create-tenant prompt (superadmin) or a contact-admin message (members).

Branding from `tenantAppearance` is applied globally by [`TenantBrandingProvider`](../theme/TenantBrandingProvider.tsx). See [theme-and-tenant-branding-guide.md](../../../docs/theme-and-tenant-branding-guide.md).
