# Web App

React Router 7 SPA with Firebase Auth, schema-driven entity UI, tenant settings, and TanStack Query caching.

**Handoff:** [docs/phase-2-platform-handoff.md](../../docs/phase-2-platform-handoff.md)

---

## Local development

1. Start Firebase emulators from repo root: `pnpm emulators`
2. Start API: `pnpm --filter api dev`
3. Start web: `pnpm --filter web dev`
4. Copy `.env.dev.example` → `.env.dev` if customizing Firebase values

Or: `pnpm dev:docker` for emulators + api + web together.

Auth uses Firebase with `browserLocalPersistence` and the Auth emulator (`127.0.0.1:9099`) by default.

---

## Architecture highlights

| Concern               | Location                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| TanStack Query        | `app/query/query-client.ts`, provider in `app/routes/private-layout.tsx` |
| Entity catalog        | `app/entities/entity-catalog-context.tsx` → `GET /api/entities`          |
| Entity data           | `app/hooks/useEntity.ts` (infinite query + mutations)                    |
| Route guards          | `app/routing/RouteGuards.tsx`                                            |
| Dynamic entity routes | `app/routing/entity-routes.ts`                                           |

React Router 7 automatically code-splits each route module file into separate browser chunks.

---

## Routing

See [app/routing/README.md](app/routing/README.md).

| Guard      | Behavior                                   |
| ---------- | ------------------------------------------ |
| Auth       | Unauthenticated → `/login`                 |
| Tenant     | No `tenantId` claim → `/select-tenant`     |
| Permission | Missing `{entity}.{action}` → forbidden UI |

### Layouts

| Layout     | Routes                                                                |
| ---------- | --------------------------------------------------------------------- |
| Public     | `/login`                                                              |
| Private    | All authenticated routes (with sidebar)                               |
| Tenant     | `/`, `/app/*` (requires tenant claim)                                 |
| Superadmin | `/settings/tenant`, `/settings/appearance`, `/platform/create-tenant` |

Settings routes (`/settings/users`, `/settings/data-models`, etc.) live in the private layout without a tenant guard. All users operate on the active JWT `tenantId`. Superadmins switch tenants via the sidebar `TenantSwitcher` or `/select-tenant`; tenant members are auto-bound to their first assigned tenant.

### Entity routes (dynamic)

| Path               | Description                             |
| ------------------ | --------------------------------------- |
| `/app/:entity`     | Entity list (table/card via UI builder) |
| `/app/:entity/new` | Create record                           |
| `/app/:entity/:id` | Edit record                             |

Sidebar lists entities from catalog filtered by `{entity}.read` permission.

---

## Settings (tenant admin)

| Path                    | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `/settings/users`       | User management — invite by email, assign roles |
| `/settings/data-models` | Model Builder — create/edit entity definitions  |
| `/settings/hooks`       | Automation hooks                                |
| `/settings/roles`       | Tenant roles + field permissions                |

Platform superadmin: **Platform → Current Tenant** at `/settings/tenant`, **Appearance** at `/settings/appearance`, and **Create tenant** via the tenant switcher or `/platform/create-tenant`.

---

## Entity UI

Components in [app/components/entity/](app/components/entity/README.md):

- **EntityTable** — virtualized rows, debounced filters, query engine integration
- **EntityForm** — schema-driven create/edit
- **EntityField** — field type rendering via registry

Permissions via `useEntityPermissions` and `useFieldAccess`. No hardcoded entity imports — catalog from API.

Guide: [docs/advanced-ui-builder-guide.md](../../docs/advanced-ui-builder-guide.md)

---

## i18n

Translations: `app/i18n/locales/{en,es}/`. English is reference locale.

```bash
pnpm i18n:validate
pnpm i18n:validate -- --strict
```

---

## UI components

Use `@repo/ui` primitives. ESLint enforces via `@repo/eslint-config/ui-primitives`.

Storybook: `pnpm storybook` from repo root.

---

## Superadmin setup

1. Set `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS=your-email@example.com` in API env
2. Sign in — first registration sets superadmin
3. Switch tenant via the sidebar switcher; open **Platform → Current Tenant** (`/settings/tenant`) to manage the active tenant; use **Settings → User Management** for tenant-scoped roles

Seed tenant roles on `users/{uid}` in Firestore (see [apps/api/README.md](../api/README.md)).

---

## Commands

```bash
pnpm --filter web dev
pnpm --filter web test
pnpm --filter web typecheck
```

---

## Related docs

- [apps/api/README.md](../api/README.md)
- [docs/e2e-validation-runbook.md](../../docs/e2e-validation-runbook.md)
- [docs/codebase-map.md](../../docs/codebase-map.md)
