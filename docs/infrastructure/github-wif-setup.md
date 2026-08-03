# GitHub Workload Identity Federation (WIF)

GitHub Actions authenticates to GCP **without long-lived JSON keys** using OIDC and Workload Identity Federation.

This guide uses **one deployer service account per GCP project** (development, staging, production).

## Prerequisites

- `gcloud` CLI installed and logged in (`gcloud auth login`)
- Three GCP projects created with billing enabled:
  - `{prefix}-development`
  - `{prefix}-staging`
  - `{prefix}-production`
- GitHub repository name: `ORG/REPO`

For this repo, the prefix is `entitysystem` and the GitHub repo is `AndresLGomezO/spa-base`.

---

## Automated setup (recommended)

Run once to configure all three environments. The script is idempotent.

```bash
bash scripts/setup-github-wif.sh entitysystem
```

With a different GitHub repo:

```bash
bash scripts/setup-github-wif.sh entitysystem --repo ORG/REPO
```

The script:

1. Derives project IDs from the prefix: `entitysystem-development`, `entitysystem-staging`, `entitysystem-production`
2. Enables APIs required before first CI deploy / Terraform apply (Artifact Registry, Storage, Run, WIF impersonation, Firebase subset — same set as `terraform/main.tf`)
3. Creates the `github-deployer` service account in each project (if missing)
4. Grants deployer IAM roles
5. Creates the WIF pool and OIDC provider bound to your GitHub repo
6. Prints `GCP_WORKLOAD_IDENTITY_PROVIDER` / `GCP_SERVICE_ACCOUNT` values for each GitHub Environment

### GitHub secrets to set

Copy the script output into GitHub → Settings → Environments.

| GitHub Environment | Secret names |
| ------------------ | ------------ |
| `development` | `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT` |
| `staging` | `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT` |
| `production` | `GCP_WORKLOAD_IDENTITY_PROVIDER_PROD`, `GCP_SERVICE_ACCOUNT_PROD` |

Production uses the `_PROD` suffix because [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) reads separate secrets for that environment.

Example values (development):

| Secret | Value |
| ------ | ----- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-deployer@entitysystem-development.iam.gserviceaccount.com` |

---

## Manual setup

Use these steps if you prefer to run commands yourself, or need to debug a single project.

### 1. Create deployer service account

```bash
export PROJECT_ID=entitysystem-development   # change per environment
export DEPLOYER_SA=github-deployer

gcloud config set project "$PROJECT_ID"

gcloud iam service-accounts create "$DEPLOYER_SA" \
  --display-name="GitHub Actions deployer"

export DEPLOYER_EMAIL="${DEPLOYER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 2. Grant project roles (deployer SA)

Minimum roles for Terraform apply + image push + Firebase deploy:

```bash
for ROLE in \
  roles/run.admin \
  roles/artifactregistry.admin \
  roles/iam.serviceAccountAdmin \
  roles/iam.serviceAccountUser \
  roles/storage.admin \
  roles/firebase.admin \
  roles/datastore.owner \
  roles/serviceusage.serviceUsageAdmin \
  roles/resourcemanager.projectIamAdmin \
  roles/secretmanager.admin \
  roles/pubsub.admin \
  roles/cloudtasks.admin \
  roles/cloudscheduler.admin \
  roles/cloudkms.admin
do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOYER_EMAIL}" \
    --role="$ROLE" \
    --condition=None
done
```

`resourcemanager.projectIamAdmin` lets Terraform grant `actAs` on runtime SAs (see `ci_deployer.tf`). Tighten later with custom roles if needed.

### 3. Create WIF pool and provider

```bash
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
export POOL_ID=github-pool
export PROVIDER_ID=github-provider
export REPO=ORG/REPO   # e.g. AndresLGomezO/spa-base

gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-condition="assertion.repository=='${REPO}'"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPO}"
```

### 4. Record provider for GitHub

Use the **numeric** resource name (not the project id):

```bash
bash scripts/print-gcp-wif-provider.sh "$PROJECT_ID"
```

Or:

```bash
gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --format='value(name)'
```

Copy into the matching **GitHub Environment** (`development`, `staging`, or `production`) for both `verify.yml` and `deploy.yml`.

Repeat steps 1–4 for `entitysystem-staging` and `entitysystem-production`.

---

## Terraform-managed `actAs` grants

On each `terraform apply`, when `ci_deployer_sa_email` is set, Terraform grants the deployer SA permission to act as:

- `es-backend-sa-{prefix}` (Cloud Run runtime)
- Default Compute SA (`{number}-compute@developer.gserviceaccount.com`) — for Firebase CLI deploy paths

See [`packages/infrastructure/terraform/ci_deployer.tf`](../../packages/infrastructure/terraform/ci_deployer.tf).

## Troubleshooting


| Error                                    | Fix                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `invalid_target` / invalid `audience`    | Re-run `setup-github-wif.sh` (fixes provider attribute-condition) and refresh `GCP_WORKLOAD_IDENTITY_PROVIDER` from `print-gcp-wif-provider.sh` |
| `iamcredentials.googleapis.com` disabled | Re-run `setup-github-wif.sh` or enable that API on the project; wait ~2 min and retry CI |
| `artifactregistry.googleapis.com` disabled | Re-run `setup-github-wif.sh` (enables all bootstrap APIs) or enable Artifact Registry manually; wait ~2 min and retry deploy |
| Auth works but 403 on later steps        | Wrong `attribute-condition` on provider — must be `assertion.repository=='owner/repo'`, not repo name alone |
| `Permission denied` on `terraform apply` | Re-run `setup-github-wif.sh` (deployer needs `roles/iam.serviceAccountAdmin`) |
| `pubsub.topics.create` / `google_pubsub_topic` 403 | Grant `roles/pubsub.admin` on `github-deployer` (included in `setup-github-wif.sh`) and re-run deploy |
| `cloudtasks.queues.create` 403 | Grant `roles/cloudtasks.admin` on `github-deployer` (included in `setup-github-wif.sh`) and re-run deploy |
| `cloudscheduler.jobs.create` 403 | Grant `roles/cloudscheduler.admin` on `github-deployer` (included in `setup-github-wif.sh`) and re-run deploy |
| `cloudkms.keyRings.create` 403 | Grant `roles/cloudkms.admin` on `github-deployer` (included in `setup-github-wif.sh`) and re-run deploy |
| Cloud Run worker-aggregation startup probe failed | Check logs; often caused by bundling `@google-cloud/vertexai` into the worker image — rebuild after pulling latest worker-aggregation esbuild fix |
| `iam.serviceAccounts.create` denied    | Same — `serviceAccountAdmin` on `github-deployer`                          |
| Terraform 409 (AR / Firestore / rules / secrets) | Run `scripts/terraform-import-brownfield.sh` before plan/apply |
| Secret `payload required`              | Add version with `gcloud secrets versions add` (Terraform creates secret only) |
| Cloud Run `reserved env PORT`            | Do not set `PORT` in Terraform; use `container_port = 3000` only (Cloud Run sets `PORT` automatically) |
| Cloud Run startup probe failed           | Add bootstrap secret version; redeploy with `SKIP_PLATFORM_STARTUP_SEEDS=true` |
| Stale `google_app_engine_application` in state | `terraform state rm google_app_engine_application.default` (App Engine product not used) |
| `iam.serviceAccounts.actAs` denied       | Re-apply Terraform with `ci_deployer_sa_email` set; check `ci_deployer.tf` |
| WIF auth fails in Actions                | Verify `attribute.repository` matches `owner/repo` exactly (`setup-github-wif.sh --repo`) |
| Firebase deploy 403                      | Ensure `roles/firebase.admin` and default compute `actAs` in `ci_deployer.tf` |

