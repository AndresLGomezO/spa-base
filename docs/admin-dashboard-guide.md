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

Superadmin only. Customize the **active** tenant’s look and feel.

| Control | Effect |
| --- | --- |
| Logo | Sidebar branding (GCS / Storage emulator) |
| Theme preset | **Default** or a named style (Soft, Bold, Elegant, Sophisticated, Professional, Business, Frutiger Aero) — seeds palettes and sample semantics |
| Primary / neutral palette | Anchor color + optional per-shade overrides; regenerates `--color-primary-*` and `--color-neutral-*` |
| Advanced semantics | Optional overrides for `--color-card`, `--color-hover`, `--color-primary`, etc. |
| Sidebar / typography / layout | Direct CSS variable overrides |

Branding applies at runtime via `TenantBrandingProvider` (`appearanceToCssVariables` from `@repo/theme`). UI components use **semantic** tokens (`bg-primary`, `bg-card`, `hover:bg-hover`), so palette changes affect buttons, inputs, and surfaces—not only the sidebar.

**Documentation:** [theme-and-tenant-branding-guide.md](./theme-and-tenant-branding-guide.md) · [packages/theme/README.md](../packages/theme/README.md)

Logo upload uses Firebase Admin Storage. See [gcs-storage-guide.md](./gcs-storage-guide.md).

### Create tenant (modal)

Superadmin only. Opens a centered modal from the tenant switcher or `/select-tenant`. Creates a new tenant and switches into it. Legacy URL `/platform/create-tenant` redirects to `/select-tenant` and opens the same modal.

## Navigation structure

| Group | Items |
| --- | --- |
| Home | `/` |
| Data Models | Dynamic `/app/:entity` links from catalog |
| Settings | User Management, Roles, Model Builder, Automation |
| Platform | Current Tenant, Appearance (superadmin) |

## Related

- [theme-and-tenant-branding-guide.md](./theme-and-tenant-branding-guide.md)
- [apps/web/README.md](../apps/web/README.md)
- [docs/e2e-validation-runbook.md](./e2e-validation-runbook.md)
