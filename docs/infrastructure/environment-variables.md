# Environment variables catalog

Single reference for **local**, **Terraform / Cloud Run**, **Vite (web build)**, and **GitHub Actions** configuration.

See also [per-environment.md](./per-environment.md) and [deployment.md](./deployment.md).

---

## API (`apps/api`)

| Variable | Local (emulator) | Cloud Run (Terraform) | Description |
| -------- | ---------------- | --------------------- | ----------- |
| `API_HOST` | `0.0.0.0` | `0.0.0.0` | Bind address |
| `API_PORT` | `3000` | `3000` | HTTP port (must match Cloud Run `container_port`) |
| `PORT` | (Cloud Run only) | auto | Set by Cloud Run from `container_port`; do not set in Terraform |
| `NODE_ENV` | `development` | `production` | Node environment |
| `GCP_PROJECT_ID` | `demo-project-base` | workspace project ID | Firebase / GCP project |
| `GCP_STORAGE_BUCKET` | `demo-project-base.appspot.com` | `{project_id}.appspot.com` | GCS bucket for tenant logos |
| `API_CORS_ORIGINS` | `http://localhost:5173,...` | Firebase Hosting URLs (comma-separated) | CORS allowlist |
| `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` | your email in `.env` | **Secret Manager** `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` (latest version) | Comma-separated emails promoted to superadmin on first login |
| `TENANT_ENCRYPTION_MASTER_KEY` | base64 key in `.env.dev` | **Secret Manager** `TENANT_ENCRYPTION_MASTER_KEY` (latest version) | 256-bit master key for field-level encryption (HKDF derives per-tenant keys) |
| `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8080` | **unset** | Firestore emulator |
| `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` | **unset** | Auth emulator |
| `FIREBASE_STORAGE_EMULATOR_HOST` | `127.0.0.1:9199` | **unset** | Storage emulator (Admin SDK) |
| `FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST` | optional in Docker | **unset** | Browser-reachable storage host |
| `CACHE_TTL_MS` | `60000` | default | In-process cache TTL |
| `API_RATE_LIMIT_MAX` | `100` | default | Rate limit max requests |
| `API_RATE_LIMIT_TIME_WINDOW_MS` | `60000` | default | Rate limit window |
| `ENABLE_PERF_LOGS` | `true` / `false` | `false` in prod | Request timing logs |
| `STRICT_QUERY_PAGINATION` | `false` | default | Reject unbounded list queries |
| `PUBSUB_EMULATOR_HOST` | `127.0.0.1:8085` / `firebase-emulator:8085` (Firebase Emulator Suite) | **unset** | Firebase Pub/Sub emulator (local only) |
| `AGGREGATION_EVENTS_PUBSUB` | `false` (host); `true` in Docker compose and Cloud Run | `true` when aggregation enabled | Publish aggregation events to Pub/Sub instead of inline processing |
| `AGGREGATION_EVENTS_TOPIC` | `aggregation-events` | `aggregation-events` | Pub/Sub topic for aggregation events |

Examples: [`apps/api/.env.dev.example`](../../apps/api/.env.dev.example), [`apps/api/.env.example`](../../apps/api/.env.example).

---

## Worker aggregation (`apps/worker-aggregation`)

| Variable | Local (emulator) | Cloud Run (Terraform) | Description |
| -------- | ---------------- | --------------------- | ----------- |
| `GCP_PROJECT_ID` | `demo-project-base` | workspace project ID | GCP project |
| `PORT` | `8080` (Cloud Run) | `8080` | Health check HTTP port |
| `PUBSUB_EMULATOR_HOST` | `127.0.0.1:8085` / `firebase-emulator:8085` | **unset** | Firebase Pub/Sub emulator (local only) |
| `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8080` | **unset** | Firestore emulator |
| `AGGREGATION_EVENTS_TOPIC` | `aggregation-events` | `aggregation-events` | Topic to subscribe to |
| `AGGREGATION_EVENTS_SUBSCRIPTION` | `aggregation-events-worker` (default) | `aggregation-events-worker` | Pull subscription (Terraform-managed in GCP) |

---

## Web (`apps/web`, Vite build-time)

| Variable | Local | CI / production build | Description |
| -------- | ----- | --------------------- | ----------- |
| `VITE_ENV` | `dev` | `dev` (dev/staging), `prod` (prod) | App mode |
| `VITE_API_URL` | `http://127.0.0.1:3000` | Terraform `backend_url` output | API base URL |
| `VITE_FIREBASE_API_KEY` | emulator fake key | GitHub secret | Firebase Web SDK |
| `VITE_FIREBASE_AUTH_DOMAIN` | `localhost` | GitHub secret | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | `demo-project-base` | GitHub secret | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `demo-project-base.appspot.com` | GitHub secret | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` | GitHub secret | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | `1:...:web:...` | GitHub secret | Firebase web app ID |
| `VITE_FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` (opt-in via `.env.development`) | **unset** (empty default) | Auth emulator (browser); omit in CI so production uses real Auth |
| `VITE_APP_CHECK_RECAPTCHA_SITE_KEY` | unset (emulator stub when Auth emulator set) | GitHub secret `FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key for Firebase App Check |
| `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` | optional in `.env.development` | **unset** | App Check debug token (local dev without Auth emulator) |

Example: [`apps/web/.env.development.example`](../../apps/web/.env.development.example).

**Deferred (post-MVP):** `VITE_GOOGLE_CLIENT_ID`.

---

## Terraform variables (`packages/infrastructure/terraform`)

| Variable | Set by | Default / notes |
| -------- | ------ | ---------------- |
| `project_id` | Local override only | Empty; workspace selects project |
| `region` | CI / `terraform.tfvars` | `us-central1` |
| `repository_name` | `terraform.tfvars` | `entitysystem-repo` |
| `db_location_id` | Optional | `nam5` (Firestore multi-region) |
| `api_image` | **Required** in CI | Artifact Registry image URI |
| `ci_deployer_sa_email` | CI | GitHub deployer SA; grants `actAs` for Cloud Run + Firebase CLI |
| `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` (Secret Manager) | Before first Cloud Run deploy | Add versions with `gcloud secrets versions add` (Terraform creates the secret only) |
| `TENANT_ENCRYPTION_MASTER_KEY` (Secret Manager) | Before first Cloud Run deploy | 256-bit base64 key for field-level encryption. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

### Secret Manager (API runtime)

| Secret ID | Cloud Run env | How to update after bootstrap |
| --------- | ------------- | ----------------------------- |
| `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` | `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` | [Google Cloud Console](https://console.cloud.google.com/security/secret-manager) → secret → **New version**, or `gcloud secrets versions add PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS --project=PROJECT_ID --data-file=-` |
| `TENANT_ENCRYPTION_MASTER_KEY` | `TENANT_ENCRYPTION_MASTER_KEY` | `gcloud secrets versions add TENANT_ENCRYPTION_MASTER_KEY --project=PROJECT_ID --data-file=-`. **Changing this key invalidates all previously encrypted data.** |

Value format for `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS`: comma-separated emails, e.g. `admin@example.com,ops@example.com`. Cloud Run always mounts **latest**; no redeploy required for new versions (Run picks up `latest` on new instances).

---

## Terraform outputs

| Output | Used for |
| ------ | -------- |
| `backend_url` | `VITE_API_URL`, smoke tests |
| `frontend_url` | Links, documentation |
| `firebase_hosting_site_id` | `firebase target:apply hosting live` |
| `gcp_project_id` | Verification |
| `artifact_registry_url` | Image push path |

---

## GitHub Actions

### Repository variables

| Name | Example | Purpose |
| ---- | ------- | ------- |
| `GCP_REGION` | `us-central1` | Region for Run, AR, state bucket |
| `GCP_REPOSITORY_NAME` | `entitysystem-repo` | Artifact Registry repo id |

### Repository or environment secrets

| Secret | Environment | Purpose |
| ------ | ----------- | ------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | development / staging (or repo) | WIF provider resource name |
| `GCP_SERVICE_ACCOUNT` | development / staging (or repo) | Deployer SA email |
| `GCP_WORKLOAD_IDENTITY_PROVIDER_PROD` | production (optional) | Separate prod WIF |
| `GCP_SERVICE_ACCOUNT_PROD` | production (optional) | Prod deployer SA |
| `FIREBASE_API_KEY` | **per** GitHub Environment | Web SDK |
| `FIREBASE_AUTH_DOMAIN` | per environment | |
| `FIREBASE_PROJECT_ID` | per environment | Must match GCP project |
| `FIREBASE_STORAGE_BUCKET` | per environment | Usually `{project}.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | per environment | |
| `FIREBASE_APP_ID` | per environment | |

GitHub Environments: `development`, `staging`, `production`.

---

## GCP keys and service accounts (not in repo)

| Asset | Where stored | Purpose |
| ----- | ------------ | ------- |
| Billing account | GCP Console | Linked to each project |
| WIF pool / provider | GCP IAM | GitHub OIDC → deployer SA |
| `github-deployer@...` | Per project | CI Terraform + deploy |
| `es-backend-sa-{dev\|stg\|prod}@...` | Terraform | Cloud Run runtime (Firestore, Auth, Storage) |
| Firebase Web app config | Firebase Console → GitHub secrets | Frontend build |
| Terraform state | GCS buckets (see [terraform-state.md](./terraform-state.md)) | Remote state |

Never commit `.env` files with real credentials; use GitHub Environment secrets for CI.
