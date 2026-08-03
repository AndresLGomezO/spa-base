# Admin components

Platform admin UI lives in [`../platform/`](../platform/) (tenant settings, appearance).

Tenant theme and branding: [TenantAppearanceEditor](../platform/TenantAppearanceEditor.tsx), applied via [`../../theme/TenantBrandingProvider.tsx`](../../theme/TenantBrandingProvider.tsx). See [theme-and-tenant-branding.md](../../../../docs/guides/theme-and-tenant-branding.md).

## TenantUserManager

[`TenantUserManager.tsx`](TenantUserManager.tsx) — invite and manage tenant users. Rendered at **Settings → User Management** (`/settings/users`).

See [admin-dashboard.md](../../../../docs/guides/admin-dashboard.md).
