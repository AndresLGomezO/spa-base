# Bootstrap a new GCP account (Entity System MVP)

Reproducible checklist for a **blank Google Cloud account** through first deploy to **development**, then staging and production.

## Overview

| Step | What you create |
| ---- | ---------------- |
| 1 | Billing + 3 GCP projects |
| 2 | Firebase + Web apps per project |
| 3 | Deployer SA + WIF per project |
| 4 | Terraform state buckets |
| 5 | GitHub variables / environment secrets |
| 6 | First `workflow_dispatch` deploy to dev |

**Project IDs (fixed in Terraform):**

| Environment | GCP project ID |
| ----------- | -------------- |
| Development | `entitysystem-development` |
| Staging | `entitysystem-staging` |
| Production | `entitysystem-production` |

**Region default:** `us-central1` (override with GitHub variable `GCP_REGION`).

---

## Step 1 — Organization and projects

1. Create a [billing account](https://console.cloud.google.com/billing) and attach a payment method.
2. In [Resource Manager](https://console.cloud.google.com/cloud-resource-manager), create three projects with the IDs above (IDs are global and cannot be changed later).
3. Link each project to the billing account.

Optional: place projects under a folder `entitysystem`.

---

## Step 2 — Firebase and Web SDK config

For **each** project:

1. Open [Firebase Console](https://console.firebase.google.com/) → **Add project** → select the existing GCP project.
2. Enable **Firestore** (Native mode) if prompted — Terraform also creates the default database.
3. Enable **Storage** (creates default bucket `{project_id}.appspot.com`).
4. Enable **Authentication** → sign-in providers you need (Email/Password, Google, etc.).
5. Project settings → **Your apps** → add **Web** app → copy SDK config:

| SDK field | GitHub secret |
| --------- | ------------- |
| apiKey | `FIREBASE_API_KEY` |
| authDomain | `FIREBASE_AUTH_DOMAIN` |
| projectId | `FIREBASE_PROJECT_ID` |
| storageBucket | `FIREBASE_STORAGE_BUCKET` |
| messagingSenderId | `FIREBASE_MESSAGING_SENDER_ID` |
| appId | `FIREBASE_APP_ID` |

Store these on the matching GitHub Environment (`development`, `staging`, `production`).

Terraform also runs `google_firebase_project` to link Firebase programmatically; Console registration of the Web app is still required for frontend secrets.

---

## Step 3 — Deployer SA and WIF (per project)

Follow [github-wif-setup.md](./github-wif-setup.md) for each of (enables GCP APIs, Artifact Registry repo `entitysystem-repo`, and configures WIF):

- `entitysystem-development` → GitHub Environment **development**
- `entitysystem-staging` → GitHub Environment **staging**
- `entitysystem-production` → GitHub Environment **production**

---

## Step 4 — Terraform state buckets

```bash
cd /path/to/project-base
export REGION=us-central1

bash scripts/ensure-terraform-state-bucket.sh \
  entitysystem-development-terraform-state entitysystem-development "$REGION"

bash scripts/ensure-terraform-state-bucket.sh \
  entitysystem-staging-terraform-state entitysystem-staging "$REGION"

bash scripts/ensure-terraform-state-bucket.sh \
  entitysystem-production-terraform-state entitysystem-production "$REGION"
```

Details: [terraform-state.md](./terraform-state.md).

---

## Step 5 — GitHub repository configuration

See also [github-secrets-checklist.md](./github-secrets-checklist.md) for a printable pre-flight list.

### Variables (repository)

| Name | Value |
| ---- | ----- |
| `GCP_REGION` | `us-central1` |
| `GCP_REPOSITORY_NAME` | `entitysystem-repo` |

### Environments

Create **development**, **staging**, **production** in GitHub → Settings → Environments. Add protection rules on `production` if desired.

### Secrets (per environment)

See [environment-variables.md](./environment-variables.md). Minimum per environment:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- All six `FIREBASE_*` secrets

### Bootstrap superadmin (Secret Manager)

Terraform creates the secret **`PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS`** (no version). Add at least one version **before** the first deploy that updates Cloud Run:

```bash
echo -n 'you@company.com,other@company.com' | gcloud secrets versions add PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS \
  --project=entitysystem-development --data-file=-
```

Repeat for staging and production when you deploy those environments. Cloud Run mounts **latest**; update emails anytime with another `gcloud secrets versions add`.

### Gmail OAuth (when enabling email ingest)

Terraform creates `GMAIL_OAUTH_*` Secret Manager shells, enables the Gmail API, and wires Pub/Sub + Cloud Tasks. Create the OAuth Web client in Console once per project, then add secret versions (see [environment-variables.md](./environment-variables.md) and [github-secrets-checklist.md](./github-secrets-checklist.md)).

---

## Step 5b — Brownfield import (if Console or CI created resources first)

If Firebase Console, Artifact Registry (`ensure-artifact-registry-repo.sh`), or a failed apply already created resources, import them before apply:

```bash
cd packages/infrastructure/terraform
terraform init -backend-config=backend-configs/dev.hcl
terraform workspace select -or-create dev
bash ../../../scripts/terraform-import-brownfield.sh entitysystem-development us-central1 entitysystem-repo
```

CI runs the same script automatically in **Deploy to GCP** and **Terraform Verification**.

Re-run WIF setup after pulling latest `setup-github-wif.sh` (`serviceAccountAdmin`, etc.):

```bash
bash scripts/setup-github-wif.sh entitysystem --repo AndresLGomezO/spa-base
```

If a failed apply added App Engine to Terraform state:

```bash
cd packages/infrastructure/terraform && terraform workspace select dev
terraform state rm google_app_engine_application.default
```

---

## Step 6 — First deploy (development)

1. Ensure `develop` branch exists (deploy maps merged PRs to dev; for first run use manual dispatch).
2. GitHub → **Actions** → **Deploy to GCP** → **Run workflow**.
3. Environment: **dev**, Dry run: **false**.
4. Wait for: API image push → Terraform apply → web build → Firebase Hosting + Storage rules deploy.

### Verify

```bash
# From terraform outputs after apply (or workflow summary)
curl -sS "https://es-backend-service-dev-PROJECT_NUMBER.us-central1.run.app/health"
```

Open `frontend_url` from Terraform output (`https://entitysystem-development.web.app` for dev).

Sign in with a user whose email is listed in the `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` secret (latest version).

---

## Step 7 — Staging and production

| Target | Trigger |
| ------ | ------- |
| Staging | Merge PR to `main`, or workflow_dispatch → staging |
| Production | Push tag `v*` (e.g. `v1.0.0`), or workflow_dispatch → prod |

Run verification on each environment before promoting traffic.

---

## Post-MVP (documented, not in this stack)

- PR preview environments (`pr-environment-*` workflows)
- App Check strict mode + reCAPTCHA
- Cloud Run worker, Cloud Tasks
- Custom domain on Firebase Hosting
- Secret Manager for all sensitive API configuration

See [deployment.md](./deployment.md) and root [docs/next-phase-backlog.md](../next-phase-backlog.md).
