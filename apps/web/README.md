# Web App

## Auth Local Development

1. Start Firebase emulators from repo root:
   - `pnpm emulators`
2. In another terminal, run the web app:
   - `pnpm --filter web dev`
3. Copy `.env.dev.example` to `.env.dev` if you need to customize Firebase values.

This app uses Firebase Auth with `browserLocalPersistence` and the Auth emulator by default (`127.0.0.1:9099`) for local development.

## i18n

Translations live under `app/i18n/locales/{en,es}/`. English (`en`) is the reference locale; every key in `en` must exist in `es` with the same structure.

- Use `useTranslation('common')` and `t('key.path')` in components.
- Locale preference is stored in `localStorage` under `i18n-locale`.
- Validate locales from repo root: `pnpm i18n:validate` (warnings only) or `pnpm i18n:validate -- --strict` (fail on unused keys).

## UI components

Use primitives from `@repo/ui` (`Button`, `Heading`, `Text`, `Card`, etc.) instead of raw `<button>`, heading tags, or `<p>` in `app/`. ESLint enforces this via `@repo/eslint-config/ui-primitives`.

Component docs and visual review: from repo root, `pnpm storybook` (package `packages/ui`).

Form primitives for entity screens: `Form`, `Input`, `Checkbox`, `FieldLabel`, `FieldError`.

## Entity UI (WS5)

Authenticated CRUD pages live under `/app/{entity}` for entities registered in [`app/entities/entity-catalog.ts`](app/entities/entity-catalog.ts) (`customer`, `order`).

## Routing (WS6)

Route guards, tenant selection, and permission-filtered navigation live in [`app/routing/`](app/routing/README.md).

| Guard      | Behavior                                   |
| ---------- | ------------------------------------------ |
| Auth       | Unauthenticated users → `/login`           |
| Tenant     | No `tenantId` claim → `/select-tenant`     |
| Permission | Missing `{entity}.{action}` → forbidden UI |

The sidebar lists only entities the user can read. Switch tenants via the footer switcher when multiple tenants are assigned.

### Local development requirements

1. Start emulators and API (`pnpm dev:docker` or `pnpm emulators` + `pnpm --filter api dev`).
2. Sign in via the web app.
3. Seed tenant roles on `users/{uid}` in Firestore (see [`apps/api/README.md`](../api/README.md)):

```json
{ "tenants": { "tenant_dev_1": ["admin"], "tenant_dev_2": ["viewer"] } }
```

4. Select a tenant at `/select-tenant` (sets the JWT `tenantId` claim via `POST /auth/select-tenant`), or set claims manually:

```js
await getAuth().setCustomUserClaims(uid, { tenantId: "tenant_dev_1" });
```

5. Refresh the ID token after changing roles (`sign out/in` or use the tenant switcher).

### Routes

| Path                | Description                  |
| ------------------- | ---------------------------- |
| `/select-tenant`    | Tenant selection (auth only) |
| `/app/customer`     | Customer list                |
| `/app/customer/new` | Create customer              |
| `/app/customer/:id` | Edit customer                |
| `/app/order`        | Order list (same pattern)    |

See [`app/components/entity/README.md`](app/components/entity/README.md) for adding new entities to the UI.

## Admin (WS7)

Superadmins can assign tenant roles at `/settings/admin`. The link appears in Settings navigation only when `isSuperAdmin` is true (from `GET /auth/validate`).

### Local superadmin setup

1. Set `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS=your-email@example.com` in API env (`apps/api/.env.dev`).
2. Sign in with Google — first registration sets `platformRole: platform.superadmin`.
3. Open `/settings/admin` to assign tenant roles to other users.
4. Superadmin tenant switcher lists all tenants from Firestore `tenants` (+ optional `PLATFORM_KNOWN_TENANTS`).

See [`app/components/admin/README.md`](app/components/admin/README.md) and [`apps/api/README.md`](../api/README.md).
