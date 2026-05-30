# Admin Dashboard Guide (Phase B)

Settings and platform administration for data models, automation, roles, and user management — all within the single authenticated sidebar layout.

## Audience

- **Tenant admins** use the **Settings** sidebar group (`/settings/*`) scoped to their JWT tenant.
- **Platform superadmins** switch tenants via the sidebar `TenantSwitcher` (same UX as tenant admins) and use **Platform** routes to manage the active tenant only.

## Sections

### Home (`/`)

Simple authenticated welcome page for all users.

### User Management (`/settings/users`)

- **Read:** `tenantUser.read`
- **Create:** `tenantUser.create` (invite by email; roles apply on first sign-in)
- **Update / remove:** `tenantUser.update`, `tenantUser.remove`

### Data Models (`/settings/data-models`)

- **Read:** `entityDefinition.read`
- **Create:** `entityDefinition.create`
- **Update:** `entityDefinition.update`

Creates dynamic entities that appear under **Data Models** in the sidebar (`/app/:entity`).

### Automation (`/settings/hooks`)

- **Read:** `hook.read`
- **Create / update:** `hook.create`, `hook.update`

### Roles & Permissions (`/settings/roles`)

- **Read:** `role.read`
- **Create / update:** `role.create`, `role.update`

### Platform — Current Tenant (`/settings/tenant`)

Superadmin only. View and edit the **active** tenant (name, status). Suspend or activate via `CurrentTenantPanel`. Requires a selected tenant in the JWT.

### Platform — Appearance (`/settings/appearance`)

Superadmin only. Upload tenant logo and override theme CSS variables for the active tenant. Branding applies at runtime via `TenantBrandingProvider`.

Logo upload uses Firebase Admin Storage (GCS in production, Storage emulator locally). Requires `FIREBASE_STORAGE_EMULATOR_HOST` in local API env. See [gcs-storage-guide.md](./gcs-storage-guide.md).

### Create tenant (`/platform/create-tenant`)

Superadmin only. Create a new tenant and switch into it. Linked from the tenant switcher and `/select-tenant`.

## Navigation structure

| Group | Items |
| --- | --- |
| Home | `/` |
| Data Models | Dynamic `/app/:entity` links from catalog |
| Settings | User Management, Roles, Model Builder, Automation |
| Platform | Current Tenant, Appearance (superadmin) |

## Related

- [apps/web/README.md](../apps/web/README.md)
- [docs/e2e-validation-runbook.md](./e2e-validation-runbook.md)
