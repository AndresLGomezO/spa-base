# Platform Admin UI and role management components.

See [`/settings/admin`](../../routes/settings/admin.tsx) for the superadmin-only page.

## Adding roles

Built-in roles are seeded into Firestore `roles/{roleId}` on API startup. User assignments are stored on `users/{uid}.tenants`.

Superadmin bootstrap uses `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` — never hardcode emails in source.
