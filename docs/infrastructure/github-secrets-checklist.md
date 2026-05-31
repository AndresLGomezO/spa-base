# GitHub secrets checklist (first deploy)

Use this checklist after completing [bootstrap-new-gcp-account.md](./bootstrap-new-gcp-account.md). Check each item before running **Deploy to GCP** → `dev`.

**WIF secrets must be on the GitHub Environment** (`development`, `staging`, `production`), not only under repository secrets. Workflows set `environment:` so Environment secrets are injected; repository-only secrets leave `workload_identity_provider` empty and `google-github-actions/auth` fails.

## Repository variables

- [ ] `GCP_REGION` = `us-central1`
- [ ] `GCP_REPOSITORY_NAME` = `entitysystem-repo`

## GitHub Environment: `development`

Project: `entitysystem-development`

- [ ] `GCP_WORKLOAD_IDENTITY_PROVIDER` — full WIF provider resource name
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
| `must specify exactly one of workload_identity_provider or credentials_json` | Secret is **empty** — not missing from GitHub, but not visible to the job. Add `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT` to the **GitHub Environment** that the job uses (`development` for dev, `staging` for staging, `production` for prod). |
| Same error on **Terraform Verification** PR | `verify.yml` uses environment `development` (PR → `develop`) or `staging` (PR → `main`). Secrets must exist on that environment. |
| Fork PR | Remote plan is skipped; fmt/validate still run. |

## First run

1. Actions → **Deploy to GCP** → Run workflow → Environment **dev** → Dry run **false**
2. Verify workflow summary URLs
3. `curl -sS "<backend_url>/health"` → `{"status":"ok"}`
4. Open frontend URL and sign in with bootstrap email

Repeat for staging and production when secrets and WIF are configured for those environments.
