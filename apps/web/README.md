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

### Local development requirements

1. Start emulators and API (`pnpm dev:docker` or `pnpm emulators` + `pnpm --filter api dev`).
2. Sign in via the web app.
3. Set Firebase custom claims for the user (required for CRUD):

```js
await getAuth().setCustomUserClaims(uid, { tenantId: "tenant_dev_1" });
```

4. Seed tenant roles on `users/{uid}` in Firestore (see [`apps/api/README.md`](../api/README.md)):

```json
{ "tenants": { "tenant_dev_1": ["admin"] } }
```

5. Refresh the ID token after changing claims or roles (`sign out/in`).

### Routes

| Path                | Description               |
| ------------------- | ------------------------- |
| `/app/customer`     | Customer list             |
| `/app/customer/new` | Create customer           |
| `/app/customer/:id` | Edit customer             |
| `/app/order`        | Order list (same pattern) |

See [`app/components/entity/README.md`](app/components/entity/README.md) for adding new entities to the UI.
