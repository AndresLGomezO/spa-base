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
| `ENABLE_PERF_LOGS` | `true` / `false` | `false` in prod | Request timing logs and Firestore persistence (`__request_perf_logs`). Can be overridden at runtime via **Platform → Observability**. |
| `STRICT_QUERY_PAGINATION` | `false` | default | Reject unbounded list queries |
| `PUBSUB_EMULATOR_HOST` | `127.0.0.1:8085` / `firebase-emulator:8085` (Firebase Emulator Suite) | **unset** | Firebase Pub/Sub emulator (local only) |
| `AGGREGATION_EVENTS_PUBSUB` | `false` (host); `true` in Docker compose and Cloud Run | `true` when aggregation enabled | Publish aggregation events to Pub/Sub instead of inline processing |
| `AGGREGATION_EVENTS_TOPIC` | `aggregation-events` | `aggregation-events` | Pub/Sub topic for aggregation events |
| `WORKER_SERVICE_URL` | `http://127.0.0.1:3001` (host); `http://worker-service:3001` (Docker) | Cloud Run worker-service URL | Base URL for AI task workers |
| `AI_TASKS_LOCAL_DISPATCH` | `true` (default non-prod) | `false` | POST AI jobs directly to worker instead of Cloud Tasks |
| `CLOUD_TASKS_QUEUE_NAME` | `ai-jobs` | `ai-jobs` | Cloud Tasks queue for AI jobs (production) |
| `HOOK_TASKS_QUEUE_NAME` | `hook-jobs` | `hook-jobs` | Cloud Tasks queue for data hook jobs (production) |
| `HOOK_TASKS_LOCAL_DISPATCH` | `true` (default non-prod) | `false` | POST data hook jobs directly to worker instead of Cloud Tasks |
| `GMAIL_OAUTH_CLIENT_ID` | OAuth Web client id in `.env` | **Secret Manager** `GMAIL_OAUTH_CLIENT_ID` (latest) | Google OAuth client for Gmail connect |
| `GMAIL_OAUTH_CLIENT_SECRET` | OAuth Web client secret in `.env` | **Secret Manager** `GMAIL_OAUTH_CLIENT_SECRET` (latest) | Google OAuth client secret |
| `GMAIL_OAUTH_REDIRECT_URI` | `http://127.0.0.1:3000/api/gmail/oauth/callback` | `https://{api}/api/gmail/oauth/callback` | Authorized redirect URI (must match Console OAuth client) |
| `GMAIL_OAUTH_STATE_SECRET` | local secret (≥16 chars) | **Secret Manager** `GMAIL_OAUTH_STATE_SECRET` (latest) | HMAC secret for OAuth state |
| `GMAIL_PUBSUB_TOPIC` | optional locally | `projects/{project}/topics/gmail-push` | Full topic id for Gmail `users.watch` (used when mode=`push`) |
| `GMAIL_INGEST_DELIVERY_MODE` | `poll` (default) | `poll` (Terraform) | Env default for `poll` vs `push`. Prefer **Platform → Observability → Gmail ingest delivery** at runtime (Firestore override; ~5s cache). Only one path is active |
| `GMAIL_TASKS_QUEUE_NAME` | `gmail-jobs` | Terraform queue name | Cloud Tasks queue for Gmail ingest jobs |
| `GMAIL_TASKS_LOCAL_DISPATCH` | `true` (default non-prod) | `false` | POST Gmail jobs directly to worker instead of Cloud Tasks |
| `WEB_APP_ORIGIN` | `http://127.0.0.1:5173` | Firebase Hosting primary URL | Post-OAuth browser redirect base (Email settings) |

Examples: [`apps/api/.env.dev.example`](../../apps/api/.env.dev.example), [`apps/api/.env.example`](../../apps/api/.env.example).

---

## Worker service — AI (`apps/worker-service`)

| Variable | Local (Docker) | Cloud Run (Terraform) | Description |
| -------- | -------------- | --------------------- | ----------- |
| `IS_LOCAL` | `true` (Docker compose) | **unset** / `false` | Enables local task auth bypass and mock eligibility |
| `USE_REAL_VERTEX` | `false` (default in `.env.dev`) | **unset** / `false` | When `IS_LOCAL=true`, set `true` to call real Vertex AI instead of mock |
| `GCP_PROJECT_ID` | `demo-project-base` | workspace project ID | Firebase / Firestore project (keep `demo-project-base` locally for emulators) |
| `VERTEX_GCP_PROJECT_ID` | optional; your GCP project for real Vertex | **unset** (falls back to `GCP_PROJECT_ID`) | Vertex AI billing project when it differs from emulator project |
| `GCP_REGION` | `us-central1` | `us-central1` | Vertex AI region |
| `VERTEX_MODEL_ID` | `gemini-2.5-flash` | `gemini-2.5-flash` | Gemini model for chat and UI builder |
| `GOOGLE_APPLICATION_CREDENTIALS` | mounted ADC path (real mode only) | **unset** (Cloud Run SA) | Path to gcloud application-default credentials |
| `FIRESTORE_EMULATOR_HOST` | `firebase-emulator:8080` | **unset** | Firestore emulator |
| `FIREBASE_AUTH_EMULATOR_HOST` | `firebase-emulator:9099` | **unset** | Auth emulator |
| `FIREBASE_STORAGE_EMULATOR_HOST` | `firebase-emulator:9199` | **unset** | Storage emulator |
| `TASKS_SA_EMAIL` | local SA email | Cloud Tasks SA | Expected OIDC email when worker auth is enabled |
| `SCHEDULED_HOOK_USER_UID` | optional in dev | required | Firebase Auth uid used as the triggering user for scheduled data hook ticks (`/tasks/schedule-tick`); must have permissions to run hook actions in each tenant |
| `WORKER_AUTH_ENABLED` | `false` | `true` in prod | Force OIDC verification even when `IS_LOCAL=true` |
| `AI_STEP_TRACE_ENABLED` | `true` in local non-prod | `false` in prod unless set | UI Builder orchestrator step trace persistence on AI jobs. Can be overridden at runtime via **Platform → Observability**. |
| `TENANT_ENCRYPTION_MASTER_KEY` | same base64 key as API `.env.dev` | **Secret Manager** `TENANT_ENCRYPTION_MASTER_KEY` (latest) | Decrypts Gmail refresh tokens (and other encrypted fields) |
| `GMAIL_OAUTH_CLIENT_ID` | same as API | **Secret Manager** `GMAIL_OAUTH_CLIENT_ID` (latest) | Refresh Gmail OAuth tokens during ingest |
| `GMAIL_OAUTH_CLIENT_SECRET` | same as API | **Secret Manager** `GMAIL_OAUTH_CLIENT_SECRET` (latest) | Refresh Gmail OAuth tokens during ingest |
| `GMAIL_PUBSUB_TOPIC` | optional locally | `projects/{project}/topics/gmail-push` | Renew Gmail watch subscriptions when mode=`push` |
| `GMAIL_INGEST_DELIVERY_MODE` | `poll` (default) | `poll` (Terraform) | Same env default as API; runtime override via **Platform → Observability** applies to worker too |
| `GMAIL_TASKS_QUEUE_NAME` | `gmail-jobs` | Terraform queue name | Queue used when self-scheduling watch renewals |
| `GMAIL_TASKS_LOCAL_DISPATCH` | `true` (local default) | `false` | When `true`, fan out process-message via HTTP; when `false`, use Cloud Tasks + OIDC (required on Cloud Run — unauthenticated self-calls get 404) |
| `WORKER_SERVICE_URL` | `http://127.0.0.1:3001` / compose hostname | Cloud Run worker URL | Target URL for Gmail Cloud Tasks / local dispatch |

Example: [`apps/worker-service/.env.dev.example`](../../apps/worker-service/.env.dev.example).

### Gmail ingest delivery

- **`poll`** (default): Cloud Scheduler hits `POST /tasks/gmail-poll` every 5 minutes; worker enqueues a **window sync** per connected mailbox. Pub/Sub watch is not started (and watch renew no-ops); `/api/gmail/pubsub` no-ops.
- **`push`**: OAuth starts `users.watch`; Pub/Sub triggers the same **window sync** path; poll handler no-ops. Switching to push from Observability also enqueues watch renew for connected mailboxes (requires `GMAIL_PUBSUB_TOPIC`).
- **Window sync** (replaces backfill + history.list): lists Gmail messages matching enabled bindings between the connection watermark (null = bootstrap / full match history) and now, fans out process-message tasks, then advances `ingestWatermarkAt` + `ingestBatchHash`. New/enabled bindings get a one-shot unbounded catch-up via `catchupNeeded`.
- **Change mode without redeploy:** Platform → Settings → Observability → **Gmail ingest delivery**. That writes `platform/runtimeSettings.gmailIngestDeliveryMode` and overrides `GMAIL_INGEST_DELIVERY_MODE` on API + worker within ~5 seconds.
- Env remains the fallback when the runtime field is `null`. Keep API/worker Terraform env aligned as the default; topic infra can stay provisioned in poll mode (unused).
- Scheduler still ticks every 5m in push mode, but the poll handler returns without fan-out (negligible cost). In poll mode, leftover Gmail pushes (until watches expire) hit Pub/Sub but the API no-ops—no duplicate ingest.
- Manual **Sync now** runs the same window sync. There is no separate backfill UI.
- Dedup: processed markers by Gmail message id + content fingerprint; rates `transaction.sourceGmailMessageId` uses getOrCreate so hooks never double-create money rows.

Local poll: when `IS_LOCAL=true` and Gmail ingest is configured, the worker starts a **5-minute** interval that POSTs `/tasks/gmail-poll` (same as Cloud Scheduler). Manual trigger still works:

```bash
curl -X POST http://127.0.0.1:3001/tasks/gmail-poll \
  -H 'Content-Type: application/json' \
  -H 'X-Local-Task-Dispatcher: true' -d '{}'
```

### AI dev mode (Docker)

| Mode | Command | Vertex behavior |
| ---- | ------- | ----------------- |
| **Mock** (default) | `pnpm dev:docker` | No GCP calls; chat and UI builder return local fixtures |
| **Real GCP** | `pnpm dev:docker:reset -- --only ai --use-real-vertex` | Calls Vertex via `gcloud auth application-default login` credentials |
| **Back to mock** | `pnpm dev:docker:reset -- --only ai --mock-vertex` | Restores local Vertex mock |

**Real mode prerequisites:** Vertex AI API enabled, `gcloud auth application-default login`, and `VERTEX_GCP_PROJECT_ID` (or `GCP_PROJECT_ID`) set in [`apps/worker-service/.env.dev`](../../apps/worker-service/.env.dev). Keep `GCP_PROJECT_ID=demo-project-base` so Firestore emulator data matches the API.

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
| `GMAIL_OAUTH_*` (Secret Manager) | Before Cloud Run revision with Gmail env (required once shells exist) | Create OAuth Web client in Console when enabling Email; until then add placeholder versions so Run can start (see below) |

### Secret Manager (API + worker runtime)

| Secret ID | Cloud Run env | How to update after bootstrap |
| --------- | ------------- | ----------------------------- |
| `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` | `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` | [Google Cloud Console](https://console.cloud.google.com/security/secret-manager) → secret → **New version**, or `gcloud secrets versions add PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS --project=PROJECT_ID --data-file=-` |
| `TENANT_ENCRYPTION_MASTER_KEY` | `TENANT_ENCRYPTION_MASTER_KEY` | `gcloud secrets versions add TENANT_ENCRYPTION_MASTER_KEY --project=PROJECT_ID --data-file=-`. **Changing this key invalidates all previously encrypted data.** |
| `GMAIL_OAUTH_CLIENT_ID` | `GMAIL_OAUTH_CLIENT_ID` | Pipe OAuth client id: `echo -n 'CLIENT_ID' \| gcloud secrets versions add GMAIL_OAUTH_CLIENT_ID --project=PROJECT_ID --data-file=-` |
| `GMAIL_OAUTH_CLIENT_SECRET` | `GMAIL_OAUTH_CLIENT_SECRET` | Pipe OAuth client secret the same way |
| `GMAIL_OAUTH_STATE_SECRET` | `GMAIL_OAUTH_STATE_SECRET` (API only) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" \| gcloud secrets versions add GMAIL_OAUTH_STATE_SECRET --project=PROJECT_ID --data-file=-` |

Value format for `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS`: comma-separated emails, e.g. `admin@example.com,ops@example.com`. Cloud Run always mounts **latest**; no redeploy required for new versions (Run picks up `latest` on new instances).

### Gmail OAuth (one-time per GCP project)

Terraform enables `gmail.googleapis.com`, creates Secret Manager shells, the `gmail-push` Pub/Sub topic (+ publisher IAM for `gmail-api-push@system.gserviceaccount.com`), push subscription to `POST /api/gmail/pubsub`, and the `gmail-jobs` Cloud Tasks queue. It **cannot** create a production-ready OAuth consent screen / Web client with `gmail.readonly`.

1. Google Cloud Console → **APIs & Services** → **OAuth consent screen** (External) → add scope `https://www.googleapis.com/auth/gmail.readonly`
2. Create an OAuth **Web** client; authorized redirect URI = Terraform `backend_url` + `/api/gmail/oauth/callback`
3. Add secret versions for `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, and `GMAIL_OAUTH_STATE_SECRET` (commands above)
4. Redeploy or restart Cloud Run so new secret versions are picked up on fresh instances

Sensitive Gmail scopes may require Google verification for multi-user production apps — same class of friction as other Google OAuth clients.

---

## Terraform outputs

| Output | Used for |
| ------ | -------- |
| `backend_url` | `VITE_API_URL`, smoke tests |
| `frontend_url` | Links, documentation |
| `firebase_hosting_site_id` | `firebase target:apply hosting live` |
| `gcp_project_id` | Verification |
| `artifact_registry_url` | Image push path |
| `gmail_jobs_queue_name` | Gmail Cloud Tasks queue |
| `gmail_pubsub_topic` | Full topic id for Gmail watch |
| `gmail_oauth_*_secret_id` | Secret Manager ids for Gmail OAuth shells |

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
