# @repo/gcp-firebase

Firebase Admin SDK integrations: Firestore repositories, query executor, auth helpers, and emulator configuration.

## Key implementations

- `createFirestoreAdminEntityRepository()` — tenant-scoped CRUD
- `createFirestoreEntityQueryExecutor()` — query engine Firestore backend + index hint logging
- `createFirestoreAdminRegisteredUserRepository()` — user access profiles
- `createFirestoreAdminEntityDefinitionRepository()` — dynamic entity definitions
- `createFirestoreAdminHookRepository()` — dynamic hooks
- `createFirestoreAdminJoinCollectionRepository()` — many-to-many joins
- `verifyFirebaseIdToken()` / `verifyFirebaseAppCheckToken()` — auth

## Configuration

Uses env from `@repo/gcp-firebase/env` merged in `apps/api/src/config/env.ts`:

- `GCP_PROJECT_ID`
- `FIRESTORE_EMULATOR_HOST`
- `FIREBASE_AUTH_EMULATOR_HOST`

## Dependencies

Implements ports from `@repo/firestore-converters`. Consumed by `apps/api` only (server-side).

## Commands

```bash
pnpm --filter @repo/gcp-firebase test
pnpm --filter @repo/gcp-firebase typecheck
```

Requires Firestore emulator for integration tests.

## Guide

[docs/firestore-collections-guide.md](../../docs/firestore-collections-guide.md)
