# GitHub secrets checklist (first deploy)

Use this checklist after completing [bootstrap-new-gcp-account.md](./bootstrap-new-gcp-account.md). Check each item before running **Deploy to GCP** → `dev`.

**WIF for Terraform verify (PRs):** use **repository secrets** (`Settings → Secrets and variables → Actions`). The verify workflow does not set `environment:`, so Environment-only secrets are not visible to that job.

**WIF for deploy:** use **GitHub Environment** secrets (`development` / `staging` / `production`) because `deploy.yml` sets `environment:`.

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

## Repository secrets (Terraform verify + optional deploy fallback)

| Secret | Value source |
| ------ | ------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `bash scripts/print-gcp-wif-provider.sh entitysystem-development` |
| `GCP_SERVICE_ACCOUNT` | `github-deployer@entitysystem-development.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING` | (optional) output for `entitysystem-staging` — used on PRs to `main` |
| `GCP_SERVICE_ACCOUNT_STAGING` | (optional) `github-deployer@entitysystem-staging.iam.gserviceaccount.com` |

## GitHub Environment: `development` (deploy workflow)

Project: `entitysystem-development`

- [ ] `GCP_WORKLOAD_IDENTITY_PROVIDER` — same **numeric** provider string as repository secret above
- [ ] `GCP_SERVICE_ACCOUNT` — `github-deployer@entitysystem-development.iam.gserviceaccount.com`
- [ ] `FIREBASE_API_KEY`
- [ ] `FIREBASE_AUTH_DOMAIN`
- [ ] `FIREBASE_PROJECT_ID` = `entitysystem-development`
- [ ] `FIREBASE_STORAGE_BUCKET` — typically `entitysystem-development.appspot.com`
- [ ] `FIREBASE_MESSAGING_SENDER_ID`
- [ ] `FIREBASE_APP_ID`

## GitHub Environment: `staging`

Project: `entitysystem-staging` — same secret names, staging values.

## GitHub Environment: `production` (before prod deploy)

Project: `entitysystem-production`

- [ ] All Firebase secrets for production Web app
- [ ] Optional: `GCP_WORKLOAD_IDENTITY_PROVIDER_PROD` and `GCP_SERVICE_ACCOUNT_PROD`

## GCP (per project)

- [ ] Billing linked
- [ ] Firebase project + Web app registered
- [ ] Deployer SA created with roles from [github-wif-setup.md](./github-wif-setup.md)
- [ ] WIF pool + provider bound to `ORG/REPO`
- [ ] Terraform state bucket exists (`entitysystem-*-terraform-state`)

## Secret Manager (per project, after first Terraform apply)

- [ ] Secret `PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS` exists (created by Terraform)
- [ ] Latest version contains comma-separated superadmin emails (set via first apply `-var='bootstrap_superadmin_emails_placeholder=...'` or `gcloud secrets versions add`)

## Terraform (optional before CI)

First apply only — initial secret placeholder (not stored in GitHub):

```bash
-var='bootstrap_superadmin_emails_placeholder=you@company.com'
```

## Troubleshooting `google-github-actions/auth` errors

| Error | Fix |
| ----- | --- |
| `must specify exactly one of workload_identity_provider or credentials_json` | Secret empty for that job. **Verify:** repository secrets. **Deploy:** Environment secrets. |
| `invalid_target` / invalid `audience` | Almost always **wrong provider string**: use project **number** (from `print-gcp-wif-provider.sh`), provider must exist in **same GCP project** as Terraform (`entitysystem-development` for PR → `develop`). Re-run `bash scripts/setup-github-wif.sh entitysystem --repo OWNER/spa-base`. |
| Provider from another GCP project | Each project has its own pool; copy provider from `print-gcp-wif-provider.sh` for **that** project only. |
| Fork PR | Remote plan skipped; fmt/validate still run. |

## First run

1. Actions → **Deploy to GCP** → Run workflow → Environment **dev** → Dry run **false**
2. Verify workflow summary URLs
3. `curl -sS "<backend_url>/health"` → `{"status":"ok"}`
4. Open frontend URL and sign in with bootstrap email

Repeat for staging and production when secrets and WIF are configured for those environments.
