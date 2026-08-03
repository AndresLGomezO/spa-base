# Deployment guide

## Architecture

```mermaid
flowchart LR
  Browser --> Hosting[Firebase_Hosting]
  Browser --> API[Cloud_Run_API]
  API --> Firestore[(Firestore)]
  API --> Storage[(GCS_default_bucket)]
  API -->|AGGREGATION_EVENTS_PUBSUB| PubSub[PubSub_aggregation_events]
  PubSub --> Worker[Cloud_Run_worker_aggregation]
  Worker --> Firestore
  Hosting -->|VITE_API_URL| API
```

- **Web:** static SPA on Firebase Hosting (`apps/web/build/client`).
- **API:** container on Cloud Run v2 (`es-backend-service-{dev|stg|prod}`), scale-to-zero.
- **Aggregation worker:** Cloud Run v2 (`es-worker-aggregation-{dev|stg|prod}`), min 1 instance, internal ingress — consumes Pub/Sub when `enable_aggregation_pubsub` is true (default for all workspaces).
- **Data:** Firestore rules/indexes via Terraform; Storage rules via `firebase deploy --only storage`.

## GitHub Actions workflows

| Workflow | When | What it does |
| -------- | ---- | ------------- |
| [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | PR / push to `develop` / `main` | App lint, tests, format (includes `pnpm terraform:fmt:check` on every run) |
| [.github/workflows/verify.yml](../../.github/workflows/verify.yml) | PR touching `packages/infrastructure/terraform/**` | Environment WIF secrets (`development` / `staging`), fmt, validate, remote plan, PR comment |
| [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) | Merge, tag `v*`, or manual | Build API + worker images, **apply**, deploy Hosting |

### Deploy workflow — triggers

| Event | Target workspace | GCP project |
| ----- | ---------------- | ----------- |
| PR merged to `develop` | `dev` | `entitysystem-development` |
| PR merged to `main` | `staging` | `entitysystem-staging` |
| Push tag `v*` | `prod` | `entitysystem-production` |
| `workflow_dispatch` | user choice | matching project |

**Note:** A plain `git push` to `develop` or `main` does **not** rebuild or redeploy Cloud Run images. After dependency fixes on a branch, merge a PR or run **Deploy to GCP** manually (`workflow_dispatch`, environment `dev` / `staging` / `prod`) so the build job produces a fresh image tagged with the commit SHA.

### Jobs

1. **resolve-target** — workspace, project, image tag.
2. **build** — Docker Buildx bake `api` + `worker-aggregation` → Artifact Registry.
3. **build-and-deploy** — Terraform init/apply → build web with `VITE_*` → `firebase deploy --only hosting:live,storage`.

Auth: **Workload Identity Federation** only (`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`). No `FIREBASE_TOKEN`.

### Frontend build

- `VITE_API_URL` = Terraform output `backend_url`.
- `VITE_ENV` = `dev` for dev/staging workspaces, `prod` for prod workspace.
- Firebase Web SDK values from environment secrets (no Auth emulator host; `VITE_APP_CHECK_RECAPTCHA_SITE_KEY` from `FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY`).

### Dry run

`workflow_dispatch` with **Dry run = true** runs through **build** and **terraform plan** (plan posted to the job summary) but skips **apply** and Firebase Hosting deploy.

### Local pre-commit

```bash
pnpm precommit
```

Runs `i18n:validate --strict`, `terraform fmt -check`, and `validate:ci` (includes `check:prod-runtime` for bundled Cloud Run apps).

## Manual deploy (local)

Prerequisites: `gcloud`, `docker`, `terraform`, `pnpm`, credentials for the target project.

```bash
export PROJECT_ID=entitysystem-development
export REGION=us-central1
export REPO=entitysystem-repo
export TAG=manual-$(git rev-parse --short HEAD)
export REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

# Build and push API + worker images
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
REGISTRY="${REGISTRY}" TAG="${TAG}" docker buildx bake -f docker-bake.hcl --push

cd packages/infrastructure/terraform
terraform init -backend-config=backend-configs/dev.hcl
terraform workspace select -or-create dev
bash ../../../scripts/terraform-import-brownfield.sh "$PROJECT_ID" "$REGION" "$REPO"

# Required before Cloud Run can mount PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS (latest)
echo -n 'you@example.com' | gcloud secrets versions add PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS \
  --project="$PROJECT_ID" --data-file=- 2>/dev/null || true

terraform apply \
  -var="region=${REGION}" \
  -var="api_image=${REGISTRY}/api:${TAG}" \
  -var="worker_aggregation_image=${REGISTRY}/worker-aggregation:${TAG}" \
  -var="ci_deployer_sa_email=github-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

export BACKEND_URL=$(terraform output -raw backend_url)
export SITE_ID=$(terraform output -raw firebase_hosting_site_id)

cd ../../..
VITE_API_URL="$BACKEND_URL" VITE_ENV=dev \
  VITE_FIREBASE_API_KEY=... \
  pnpm --filter web build

pnpm exec firebase use "$PROJECT_ID"
pnpm exec firebase target:apply hosting live "$SITE_ID"
pnpm exec firebase deploy --only hosting:live,storage --non-interactive
```

`firebase.json` must declare hosting target `live` (repo root). `target:apply` maps `live` → the Terraform site id in `.firebaserc`.

Fill `VITE_FIREBASE_*` from Firebase Console.

## Troubleshooting

| Symptom | Check |
| ------- | ----- |
| Cloud Run unhealthy | `GET /health` on API; logs in Cloud Logging |
| CORS errors | `API_CORS_ORIGINS` includes Hosting `.web.app` and `.firebaseapp.com` URLs |
| 401 on API | Real Firebase ID token + App Check token; verify App Check registered in Console and `FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY` in GitHub Environment |
| Auth opens `127.0.0.1:9099` | Redeploy web after fix; ensure `VITE_FIREBASE_AUTH_EMULATOR_HOST` is not set in CI build |
| Terraform 409 on index | Wait and re-apply (see [terraform-state.md](./terraform-state.md)) |
| Terraform 409 Artifact Registry / Firestore / rules release | Run `scripts/terraform-import-brownfield.sh` (CI runs it automatically) |
| Terraform 403 `serviceAccounts.create` | Re-run `setup-github-wif.sh` (`roles/iam.serviceAccountAdmin` on deployer) |
| Secret version `payload required` | Terraform no longer creates versions — use `gcloud secrets versions add` |
| Firebase deploy permission | WIF + `roles/firebase.admin` + compute default `actAs` in `ci_deployer.tf` |
| Cloud Run `reserved env PORT` | Remove `PORT` from Terraform env; `container_port` sets it automatically |
| Stale App Engine in Terraform state | `terraform state rm google_app_engine_application.default` if a prior apply added it |
| Cloud Run startup probe failed | Ensure bootstrap secret has a version; check logs. The API does not seed Firestore on startup — use `pnpm seed:database` when seeding is needed |
| Cloud Run worker-aggregation startup probe failed | Check revision logs for `Dynamic require of "child_process" is not supported` — rebuild worker-aggregation after the Vertex bundle fix; redeploy |
| Cloud Run worker-service startup probe failed | Check logs for `Dynamic require of "stream"` or `"child_process"` — GCP SDK was bundled into ESM. Rebuild worker-service (esbuild externals + narrow imports). If logs show a multi-MB `dist/index.js`, clear stale GHA BuildKit cache (`SOURCE_REVISION` / `--force` in worker Dockerfiles) and redeploy |
| `Cannot find package '…'` from `/app/dist/index.js` (worker-service) | The bundled entry keeps npm imports external; `pnpm deploy --prod` only ships **direct** [`worker-service/package.json`](../apps/worker-service/package.json) dependencies. Add the missing package there (and to [`esbuild.mjs`](../apps/worker-service/esbuild.mjs) `npmExternals` when CJS/GCP). Reproduce locally: `pnpm run check:prod-runtime` (deploys outside the repo tree so hoisted monorepo `node_modules` cannot mask missing deps; also runs in `validate:local` / `precommit`). After fixing deps, trigger a fresh image build (merged PR or `workflow_dispatch`) — Cloud Run will keep serving the previous image until then |
| `cloudtasks.queues.create` 403 on Terraform apply | Re-run `bash scripts/setup-github-wif.sh entitysystem` to grant `roles/cloudtasks.admin` on `github-deployer`, then re-run deploy |
| `cloudscheduler.jobs.create` 403 on Terraform apply | Re-run `bash scripts/setup-github-wif.sh entitysystem` to grant `roles/cloudscheduler.admin` on `github-deployer`, then re-run deploy |
| `cloudkms.keyRings.create` 403 on Terraform apply | Re-run `bash scripts/setup-github-wif.sh entitysystem` to grant `roles/cloudkms.admin` on `github-deployer`, then re-run deploy |
| `Cannot find package 'firebase-admin'` (api) | Add every [`esbuild.mjs`](../apps/api/esbuild.mjs) `external` as a direct `api` dependency; image uses `pnpm deploy --legacy` |
| `Dynamic require of "stream" is not supported` | Add `@google-cloud/firestore` to [`esbuild.mjs`](../apps/api/esbuild.mjs) `external` and `api` dependencies (do not bundle; CJS-only) |
| Hosting target `live` not detected | [`firebase.json`](../../firebase.json) must use `"hosting": [{ "target": "live", ... }]`; run `firebase target:apply hosting live SITE_ID` before deploy |
| Dev still on `esd-*.web.app` | Run Terraform apply (removes dedicated `google_firebase_hosting_site.dev`); redeploy web so `firebase target:apply hosting live entitysystem-development` deploys to the default site |
| `COLLECTION_GROUP_ASC index for user_invites` | Ensure `user_invites` / `email` is in `fieldOverrides` in [`firestore.indexes.json`](../../firestore.indexes.json); run Terraform apply (`google_firestore_field`); wait for index **Enabled** in Console |
| Terraform 400 `single field index controls` | Single-field indexes must use `fieldOverrides`, not the `indexes` array — see [terraform-state.md](./terraform-state.md) |
| Logo upload `uniform bucket-level access` | API uses Firebase download tokens, not `makePublic()` — redeploy API after pulling latest `@repo/gcp-firebase` |
| Platform roles/tenants missing | Run `pnpm seed:database` locally against the project (with emulators or GCP credentials as in `apps/api/.env.dev`) |

## PR preview environments (phase 1b)

Not included in MVP. To add later:

- `pr-environment-deploy.yml`, `cleanup.yml`, `reactivate.yml`, `maintenance.yml`
- Terraform workspace `pr` and `firestore_collection_prefix` variable
