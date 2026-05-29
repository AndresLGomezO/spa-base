# Platform Admin UI and role management components.

See [`/settings/admin`](../../routes/settings/admin.tsx) for the superadmin-only page.

## TenantManager

[`TenantManager.tsx`](TenantManager.tsx) lists tenants from `GET /admin/tenants`, creates tenants via `POST /admin/tenants`, and suspends or activates tenants via `PATCH /admin/tenants/:id`. Dev tenants are seeded by the API; use this UI to add more.

## UserRoleManager

[`UserRoleManager.tsx`](UserRoleManager.tsx) assigns tenant roles per user. The tenant dropdown uses tenant records from the admin API (names, not raw env IDs).

## Adding roles

Built-in roles are seeded into Firestore `roles/{roleId}` on API startup. User assignments are stored on `users/{uid}.tenants`.

Superadmin bootstrap uses `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` — never hardcode emails in source.
