# Web App

## Auth Local Development

1. Start Firebase emulators from repo root:
   - `pnpm emulators`
2. In another terminal, run the web app:
   - `pnpm --filter web dev`
3. Copy `.env.dev.example` to `.env.dev` if you need to customize Firebase values.

This app uses Firebase Auth with `browserLocalPersistence` and the Auth emulator by default (`127.0.0.1:9099`) for local development.
