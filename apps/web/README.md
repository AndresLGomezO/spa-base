# Web App

React Router 7 SPA with Firebase Auth, schema-driven entity UI, tenant settings, and TanStack Query caching.

---

## Local development

1. Start Firebase emulators from repo root: `pnpm emulators`
2. Start API: `pnpm --filter api dev`
3. Start web: `pnpm --filter web dev`
4. Copy [`.env.development.example`](./.env.development.example) → `.env.development` to opt in to Firebase emulators (Auth at `127.0.0.1:9099`).

Or: `pnpm dev:docker` for emulators + api + web together.

Deployed builds use real Firebase Auth and App Check (reCAPTCHA v3). Local emulator mode is **opt-in** via `VITE_FIREBASE_AUTH_EMULATOR_HOST` in `.env.development`.

---

## Architecture highlights

| Concern               | Location                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------- |
| TanStack Query        | `app/query/query-client.ts`, provider in `app/routes/private-layout.tsx`                      |
| Entity catalog        | `app/entities/entity-catalog-context.tsx` — 30s staleTime; refreshes on `/app/:entity` routes |
| Entity data           | `app/hooks/useEntity.ts` (infinite query + mutations)                                         |
| Route guards          | `app/routing/RouteGuards.tsx`                                                                 |
| Dynamic entity routes | `app/routing/entity-routes.ts`                                                                |

React Router 7 automatically code-splits each route module file into separate browser chunks.

---

## Routing

See [app/routing/README.md](app/routing/README.md).

| Guard      | Behavior                                                   |
| ---------- | ---------------------------------------------------------- |
| Auth       | Unauthenticated → `/login`                                 |
| Tenant     | No `tenantId` → auto-bind first tenant; none → empty state |
| Permission | Missing `{entity}.{action}` → forbidden UI                 |

### Layouts

| Layout     | Routes                                                                         |
| ---------- | ------------------------------------------------------------------------------ |
| Public     | `/login`                                                                       |
| Private    | All authenticated routes — **fixed viewport** (`h-dvh`); only `<main>` scrolls |
| Tenant     | `/`, `/app/*` (requires tenant claim)                                          |
| Superadmin | `/settings/tenant`, `/settings/appearance`                                     |

Settings routes (`/settings/users`, `/settings/data-models`, etc.) live in the private layout without a tenant guard. All users operate on the active JWT `tenantId`. The first available tenant is auto-selected on sign-in; superadmins switch via the sidebar `TenantSwitcher`.

### Entity routes (dynamic)

| Path               | Description                           |
| ------------------ | ------------------------------------- |
| `/app/:entity`     | Entity list; create/edit in modals    |
| `/app/:entity/new` | Legacy redirect → `?create` on list   |
| `/app/:entity/:id` | Legacy redirect → `?edit=:id` on list |

Sidebar lists entities from catalog filtered by `{entity}.read` permission.

---

## Settings (tenant admin)

| Path                    | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `/settings/users`       | User management — invite by email, assign roles |
| `/settings/data-models` | Model Builder — create/edit entity definitions  |
| `/settings/hooks`       | Automation hooks                                |
| `/settings/roles`       | Tenant roles + field permissions                |

Platform superadmin: **Platform → Current Tenant** at `/settings/tenant`, **Appearance** at `/settings/appearance`, and **Create tenant** via modal from the tenant switcher or the no-tenants empty state.

---

## Entity UI

Components in [app/components/entity/](app/components/entity/README.md):

- **EntityTable** — virtualized rows, debounced filters, query engine, one-to-many reverse lookup columns
- **EntityForm** — schema-driven create/edit; strips non-document relation keys from payload
- **EntityField** — `RelationPicker` (FK), `ManyToManyRelationPicker` (M2M sync API)

Permissions via `useEntityPermissions` and `useFieldAccess`. No hardcoded entity imports — catalog from API.

Guide: [docs/guides/advanced-ui-builder.md](../../docs/guides/advanced-ui-builder.md)

---

## i18n

Translations: `app/i18n/locales/{en,es}/`. English is reference locale.

```bash
pnpm i18n:validate
pnpm i18n:validate -- --strict
```

---

## Theming and tenant branding

Tenant colors and typography are applied at runtime from Firestore `appearance` via [`TenantBrandingProvider`](app/theme/TenantBrandingProvider.tsx).

| Topic                                | Location                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Full guide (palette → semantic → UI) | [docs/guides/theme-and-tenant-branding.md](../../docs/guides/theme-and-tenant-branding.md)            |
| Theme package API                    | [packages/theme/README.md](../../packages/theme/README.md)                                            |
| Appearance editor                    | `/settings/appearance` — [TenantAppearanceEditor](app/components/platform/TenantAppearanceEditor.tsx) |
| Light / dark mode                    | `ThemeProvider` in [app/root.tsx](app/root.tsx), toggle in sidebar                                    |

**Rules for app code:**

- Import theme CSS in [app/app.css](app/app.css) (`tokens.css` → `semantics.css` → `dark.css`).
- Use semantic Tailwind classes (`bg-primary`, `text-muted-foreground`, `bg-card`) — not raw scale steps like `bg-primary-600`.
- Do not hardcode tenant-specific hex in components; use the Appearance editor or `appearance.semantics`.

---

## UI components

Use `@repo/ui` primitives. ESLint enforces via `@repo/eslint-config/ui-primitives`, `ui-overlays`, and `ui-toasts` (see `apps/web/eslint.config.js`).

**Overlay primitives** (never build custom dialogs in app code):

- `Modal` — centered dialogs (confirmations, forms, previews)
- `Sheet` — slide-over panels (mobile sidebar via `SidebarMobile`)
- `PhotoUpload` — image select, crop, upload, and expand preview

**Toasts** (transient feedback only; mount `<Toaster />` once in `app/root.tsx`):

- `toast` — `toast.success`, `toast.error`, etc. from `@repo/ui`
- Keep `Alert` for inline/persistent form and page messages

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
- [docs/guides/theme-and-tenant-branding.md](../../docs/guides/theme-and-tenant-branding.md)
- [docs/guides/e2e-validation-runbook.md](../../docs/guides/e2e-validation-runbook.md)
- [docs/guides/codebase-map.md](../../docs/guides/codebase-map.md)
