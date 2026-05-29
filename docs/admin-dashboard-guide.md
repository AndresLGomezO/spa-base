# Admin Dashboard Guide (Phase B)

The tenant admin control plane provides a unified interface for configuring data models, automation hooks, and roles without leaving the private app layout.

## Audience

- **Tenant admins** use the Control Plane sidebar group and routes under `/settings/*` within the tenant-scoped private layout.
- **Platform superadmins** use `/settings/admin` (auth-only layout) for cross-tenant tenant/user management, with links to cross-tenant data models, hooks, and roles.

## Sections

### Dashboard (`/`)

Visible when the user has any of `entityDefinition.read`, `role.read`, or `hook.read`.

Shows summary counts for:

- Runtime entities (from entity catalog)
- Data model definitions
- Roles
- Automation hooks

Quick links navigate to permitted admin sections.

Users without admin permissions see the standard session home page.

### Data Models (`/settings/data-models`)

- **Read:** `entityDefinition.read`
- **Create:** `entityDefinition.create`
- **Edit:** `entityDefinition.update`

Lists tenant entity definitions, supports create wizard and edit flow (label + fields). Entity names are immutable after creation; field changes follow server-side evolution rules.

Superadmin cross-tenant: `/settings/admin/data-models`

### Automation (`/settings/hooks`)

- **Read:** `hook.read`
- **Create:** `hook.create`
- **Update:** `hook.update`

Manage action hooks bound to entity events (e.g. `loan.beforeCreate`) with structured actions:

- `updateField`
- `createRecord`
- `sendNotification`

Superadmin cross-tenant: `/settings/admin/hooks`

### Roles & Permissions (`/settings/roles`)

Reuses the RBAC UI from Advanced RBAC (10.5). Nav moved from Settings to Control Plane.

Superadmin cross-tenant: `/settings/admin/roles`

## Navigation

The **Control Plane** sidebar group appears between Home and entity data links when the user has admin permissions. Settings retains profile, team, billing, and (for superadmin) platform admin.

## Out of scope (Phase B)

- Users / teams management UI
- Modules UI
- UI Builder admin
- Advanced analytics and audit logs

## API dependencies

The dashboard UI calls existing API routes:

- `GET /api/entity-definitions`, `GET/PATCH /api/entity-definitions/:id`
- `GET/POST/PATCH /api/hooks`
- `GET /api/roles`
- `GET /api/entities` (catalog)

No new backend routes were added for Phase B.
