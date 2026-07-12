# GitHub secrets checklist (first deploy)

Use this checklist after completing [bootstrap-new-gcp-account.md](./bootstrap-new-gcp-account.md). Check each item before running **Deploy to GCP** → `dev`.

**WIF and Firebase secrets** live on **GitHub Environments** (`development`, `staging`, `production`). Both `verify.yml` and `deploy.yml` set `environment:` so those secrets are available.

**Repository variables only:** `GCP_REGION`, `GCP_REPOSITORY_NAME` (not secrets).

**Provider value must use the project number** (digits), not project id:

```text
# Correct (from print-gcp-wif-provider.sh)
projects/123456789012/locations/global/workloadIdentityPools/github-pool/providers/github-provider

# Wrong — causes invalid_target
projects/entitysystem-development/locations/global/...
```

## Repository variables

- [ ] `GCP_REGION` = `us-central1`
- [ ] `GCP_REPOSITORY_NAME` = `entitysystem-repo`

## GitHub Environment: `development`

Used by: PRs → `develop` (Terraform verify), deploy to dev.

Project: `entitysystem-development`

- [ ] `GCP_WORKLOAD_IDENTITY_PROVIDER` — from `bash scripts/print-gcp-wif-provider.sh entitysystem-development`
- [ ] `GCP_SERVICE_ACCOUNT` — `github-deployer@entitysystem-development.iam.gserviceaccount.com`
- [ ] `FIREBASE_API_KEY`
- [ ] `FIREBASE_AUTH_DOMAIN`
- [ ] `FIREBASE_PROJECT_ID` = `entitysystem-development`
- [ ] `FIREBASE_STORAGE_BUCKET` — typically `entitysystem-development.appspot.com`
- [ ] `FIREBASE_MESSAGING_SENDER_ID`
- [ ] `FIREBASE_APP_ID`
- [ ] `FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY` — reCAPTCHA v3 site key from Firebase Console → App Check (Web app)

## GitHub Environment: `staging`

Used by: PRs → `main` (Terraform verify), deploy to staging.

Project: `entitysystem-staging` — same secret **names**, values from `print-gcp-wif-provider.sh entitysystem-staging`.

- [ ] `GCP_WORKLOAD_IDENTITY_PROVIDER`
- [ ] `GCP_SERVICE_ACCOUNT`
- [ ] All `FIREBASE_*` secrets for staging Web app (including `FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY`)

## GitHub Environment: `production` (before prod deploy)

Project: `entitysystem-production`

- [ ] All Firebase secrets for production Web app (including `FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY`)
- [ ] Optional: `GCP_WORKLOAD_IDENTITY_PROVIDER_PROD` and `GCP_SERVICE_ACCOUNT_PROD`

## GCP (per project)

- [ ] Billing linked
- [ ] Firebase project + Web app registered
- [ ] App Check registered for Web app (reCAPTCHA v3); enforcement **Monitor** until login works
- [ ] Auth authorized domains include Hosting `*.web.app` / `*.firebaseapp.com`
- [ ] Deployer SA created with roles from [github-wif-setup.md](./github-wif-setup.md) (includes `roles/iam.serviceAccountAdmin`)
- [ ] WIF pool + provider bound to `ORG/REPO`
- [ ] Terraform state bucket exists (`entitysystem-*-terraform-state`)

## Secret Manager (per project)

- [ ] Secret `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` exists (created by Terraform on first apply)
- [ ] At least one secret **version** added before Cloud Run deploy:

```bash
echo -n 'you@company.com' | gcloud secrets versions add PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS \
  --project=entitysystem-development --data-file=-
```

- [ ] Secret `TENANT_ENCRYPTION_MASTER_KEY` exists (created by Terraform on first apply)
- [ ] At least one secret **version** added before Cloud Run deploy:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" | \
  gcloud secrets versions add TENANT_ENCRYPTION_MASTER_KEY \
    --project=entitysystem-development --data-file=-
```

> **Warning:** changing the encryption master key invalidates all previously encrypted field data.

### Gmail ingest secrets (required for Cloud Run after Terraform creates the shells)

Terraform mounts `GMAIL_OAUTH_*` on the API (and client id/secret on the worker). Cloud Run **will not start** until each secret has at least one version. Placeholders are fine until you create a real OAuth Web client:

```bash
echo -n 'pending' | gcloud secrets versions add GMAIL_OAUTH_CLIENT_ID \
  --project=entitysystem-development --data-file=-
echo -n 'pending' | gcloud secrets versions add GMAIL_OAUTH_CLIENT_SECRET \
  --project=entitysystem-development --data-file=-
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | \
  gcloud secrets versions add GMAIL_OAUTH_STATE_SECRET \
  --project=entitysystem-development --data-file=-
```

When enabling Email settings for users:

- [ ] OAuth consent screen (External) with scope `gmail.readonly`
- [ ] OAuth **Web** client; redirect URI = `https://{backend_url}/api/gmail/oauth/callback`
- [ ] Replace placeholder versions with real client id/secret (same `gcloud secrets versions add` commands)

See [environment-variables.md](./environment-variables.md) → Gmail OAuth.

## Terraform brownfield (if apply failed with 409)

```bash
cd packages/infrastructure/terraform && terraform init -backend-config=backend-configs/dev.hcl
terraform workspace select dev
bash ../../../scripts/terraform-import-brownfield.sh entitysystem-development us-central1 entitysystem-repo
```

Re-run WIF setup if apply failed with `serviceAccounts.create` or `getIamPolicy` denied:

```bash
bash scripts/setup-github-wif.sh entitysystem --repo AndresLGomezO/spa-base
```

## Troubleshooting `google-github-actions/auth` errors

| Error | Fix |
| ----- | --- |
| `must specify exactly one of workload_identity_provider or credentials_json` | Secret empty — add `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT` on the GitHub **Environment** for that job (`development` or `staging`). |
| `invalid_target` / invalid `audience` | Re-run `bash scripts/setup-github-wif.sh entitysystem --repo OWNER/spa-base` to fix pool/provider attribute rules, then refresh secrets from `print-gcp-wif-provider.sh`. |
| `gsutil` / “credentials are invalid” after auth | WIF does not work with `gsutil`; state bucket script uses `gcloud storage`. Re-run the workflow after pulling latest `ensure-terraform-state-bucket.sh`. |
| `IAM Service Account Credentials API has not been used` / `SERVICE_DISABLED` | Re-run `setup-github-wif.sh` (enables `iamcredentials.googleapis.com`) or enable that API manually; wait 1–2 minutes, retry CI. |
| `Artifact Registry API has not been used` / push denied | Re-run `setup-github-wif.sh` or `gcloud services enable artifactregistry.googleapis.com --project=PROJECT_ID`; wait 1–2 minutes, retry deploy. |
| Provider from another GCP project | Each environment needs the provider from **that** GCP project (`print-gcp-wif-provider.sh entitysystem-development`, etc.). |
| Fork PR | Remote plan skipped; fmt/validate still run. |

## First run

1. Actions → **Deploy to GCP** → Run workflow → Environment **dev** → Dry run **false**
2. Verify workflow summary URLs
3. `curl -sS "<backend_url>/health"` → `{"status":"ok"}`
4. Open frontend URL and sign in with bootstrap email

Repeat for staging and production when secrets and WIF are configured for those environments.
