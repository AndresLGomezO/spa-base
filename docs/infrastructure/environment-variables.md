# Environment variables catalog

Single reference for **local**, **Terraform / Cloud Run**, **Vite (web build)**, and **GitHub Actions** configuration.

See also [per-environment.md](./per-environment.md) and [deployment.md](./deployment.md).

---

## API (`apps/api`)

| Variable | Local (emulator) | Cloud Run (Terraform) | Description |
| -------- | ---------------- | --------------------- | ----------- |
| `API_HOST` | `0.0.0.0` | `0.0.0.0` | Bind address |
| `API_PORT` | `3000` | `3000` | HTTP port (must match Cloud Run `container_port`) |
| `PORT` | (unset) | (optional) | If set by platform, overrides listen port in `index.ts` |
| `NODE_ENV` | `development` | `production` | Node environment |
| `GCP_PROJECT_ID` | `demo-project-base` | workspace project ID | Firebase / GCP project |
| `GCP_STORAGE_BUCKET` | `demo-project-base.appspot.com` | `{project_id}.appspot.com` | GCS bucket for tenant logos |
| `API_CORS_ORIGINS` | `http://localhost:5173,...` | Firebase Hosting URLs (comma-separated) | CORS allowlist |
| `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` | your email in `.env` | **Secret Manager** `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` (latest version) | Comma-separated emails promoted to superadmin on first login |
| `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8080` | **unset** | Firestore emulator |
| `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` | **unset** | Auth emulator |
| `FIREBASE_STORAGE_EMULATOR_HOST` | `127.0.0.1:9199` | **unset** | Storage emulator (Admin SDK) |
| `FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST` | optional in Docker | **unset** | Browser-reachable storage host |
| `CACHE_TTL_MS` | `60000` | default | In-process cache TTL |
| `API_RATE_LIMIT_MAX` | `100` | default | Rate limit max requests |
| `API_RATE_LIMIT_TIME_WINDOW_MS` | `60000` | default | Rate limit window |
| `ENABLE_PERF_LOGS` | `true` / `false` | `false` in prod | Request timing logs |
| `STRICT_QUERY_PAGINATION` | `false` | default | Reject unbounded list queries |

Examples: [`apps/api/.env.dev.example`](../../apps/api/.env.dev.example), [`apps/api/.env.example`](../../apps/api/.env.example).

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
| `VITE_FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` | **unset** in deployed builds | Auth emulator (browser) |

Example: [`apps/web/.env.dev.example`](../../apps/web/.env.dev.example).

**Deferred (post-MVP):** `VITE_APP_CHECK_RECAPTCHA_SITE_KEY`, `VITE_GOOGLE_CLIENT_ID`.

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

### Secret Manager (API runtime)

| Secret ID | Cloud Run env | How to update after bootstrap |
| --------- | ------------- | ----------------------------- |
| `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` | `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` | [Google Cloud Console](https://console.cloud.google.com/security/secret-manager) → secret → **New version**, or `gcloud secrets versions add PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS --project=PROJECT_ID --data-file=-` |

Value format: comma-separated emails, e.g. `admin@example.com,ops@example.com`. Cloud Run always mounts **latest**; no redeploy required for new versions (Run picks up `latest` on new instances).

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
