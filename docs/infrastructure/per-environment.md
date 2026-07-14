# Per-environment guide

How **localhost**, **development**, **staging**, and **production** differ, and what you need to configure in each.

## Quick reference

| Environment | Web URL | API URL | Firebase | Real GCP billing |
| ----------- | ------- | ------- | -------- | ---------------- |
| Localhost | `http://localhost:5173` or Hosting emulator `:5002` | `http://127.0.0.1:3000` | Emulators (`demo-project-base`) | No |
| Development | `https://entitysystem-development.web.app` | `https://es-backend-service-dev-....run.app` | `entitysystem-development` | Yes |
| Staging | `https://entitysystem-staging.web.app` | `https://es-backend-service-stg-....run.app` | `entitysystem-staging` | Yes |
| Production | `https://entitysystem-production.web.app` | `https://es-backend-service-prod-....run.app` | `entitysystem-production` | Yes |

Exact URLs come from `terraform output` after apply.

---

## 1. Localhost (emulators)

### Stack

```bash
pnpm install
pnpm emulators          # Auth, Firestore, Storage, Hosting emulators
pnpm --filter api dev
pnpm --filter web dev
```

Or: `pnpm dev:docker` (see [firestore-collections-guide.md](../firestore-collections-guide.md) for Docker networking).

### API (`apps/api/.env.dev`)

| Variable | Typical value |
| -------- | ------------- |
| `GCP_PROJECT_ID` | `demo-project-base` |
| `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8080` |
| `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` |
| `FIREBASE_STORAGE_EMULATOR_HOST` | `127.0.0.1:9199` |
| `API_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` |

### Web (`apps/web/.env.development`)

| Variable | Typical value |
| -------- | ------------- |
| `VITE_ENV` | `dev` |
| `VITE_API_URL` | `http://127.0.0.1:3000` |
| `VITE_FIREBASE_*` | Emulator defaults in `.env.development.example` |
| `VITE_FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` (opt-in; omit for real GCP Auth locally) |
| `VITE_APP_CHECK_RECAPTCHA_SITE_KEY` | unset with emulator; required for deployed builds |

### Bootstrap superadmin locally

```bash
PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS=you@example.com
```

---

## 2. Development (GCP)

- **Deploy:** merge to `develop` or workflow_dispatch → dev.
- **Cloud Run:** min instances `0`, 250m CPU / 256Mi (cold starts expected).
- **Hosting:** default site (`entitysystem-development.web.app` / `.firebaseapp.com`).
- **CORS:** Terraform sets `API_CORS_ORIGINS` to dev Hosting URLs.
- **GitHub Environment:** `development` with secrets for `entitysystem-development`.

---

## 3. Staging (GCP)

- **Deploy:** merge to `main` or workflow_dispatch → staging.
- Same scaling tier as dev (scale-to-zero, small CPU).
- **Hosting:** default site = project id `entitysystem-staging`.
- **Web `VITE_ENV`:** `dev` until app schema adds a staging mode (same API behavior as dev tier).

---

## 4. Production (GCP)

- **Deploy:** git tag `v*` or workflow_dispatch → prod.
- **Cloud Run:** scale-to-zero with higher max instances and 1 vCPU when warm.
- **GitHub Environment:** `production` with optional separate WIF secrets (`GCP_*_PROD`).
- Protect production environment in GitHub (required reviewers).

---

## What Terraform manages vs CI

| Asset | Owner |
| ----- | ----- |
| Firestore database, rules, indexes | Terraform |
| Cloud Run API service + IAM | Terraform |
| Firebase Hosting site (dev extra site) | Terraform |
| Firebase project link | Terraform |
| Artifact Registry repository | Terraform |
| Storage security rules | CI `firebase deploy --only storage` |
| Hosting static files | CI `firebase deploy --only hosting:live` |

---

## Related docs

- [bootstrap-new-gcp-account.md](./bootstrap-new-gcp-account.md)
- [environment-variables.md](./environment-variables.md)
- [deployment.md](./deployment.md)
- [gcs-storage-guide.md](../gcs-storage-guide.md)
