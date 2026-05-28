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
