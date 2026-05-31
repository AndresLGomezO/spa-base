# Infrastructure (Terraform)

GCP resources for **Entity System** (Firebase Hosting, Firestore, Storage rules, Cloud Run API).

## Documentation

| Guide                                                                                                      | Description                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [docs/infrastructure/bootstrap-new-gcp-account.md](../../docs/infrastructure/bootstrap-new-gcp-account.md) | New GCP account → projects → WIF → first deploy  |
| [docs/infrastructure/github-secrets-checklist.md](../../docs/infrastructure/github-secrets-checklist.md)   | Pre-flight checklist before first Actions deploy |
| [docs/infrastructure/terraform-state.md](../../docs/infrastructure/terraform-state.md)                     | Remote state buckets and workspaces              |
| [docs/infrastructure/environment-variables.md](../../docs/infrastructure/environment-variables.md)         | All vars, secrets, and env keys                  |
| [docs/infrastructure/deployment.md](../../docs/infrastructure/deployment.md)                               | CI/CD and branch → environment mapping           |
| [docs/infrastructure/github-wif-setup.md](../../docs/infrastructure/github-wif-setup.md)                   | Workload Identity Federation for GitHub Actions  |
| [docs/infrastructure/per-environment.md](../../docs/infrastructure/per-environment.md)                     | Localhost vs dev / staging / prod                |

## Quick commands

From repo root, with `gcloud` authenticated to the target project:

```bash
cd packages/infrastructure/terraform

# Dev (entitysystem-development)
terraform init -backend-config=backend-configs/dev.hcl
terraform workspace select -or-create dev
bash ../../../scripts/terraform-import-brownfield.sh entitysystem-development us-central1 entitysystem-repo
terraform plan \
  -var="api_image=us-central1-docker.pkg.dev/entitysystem-development/entitysystem-repo/api:latest" \
  -var="ci_deployer_sa_email=github-deployer@entitysystem-development.iam.gserviceaccount.com"

# Staging
terraform init -reconfigure -backend-config=backend-configs/staging.hcl
terraform workspace select -or-create staging

# Production
terraform init -reconfigure -backend-config=backend-configs/prod.hcl
terraform workspace select -or-create prod
```

| [.github/workflows/verify.yml](../../.github/workflows/verify.yml) | PRs that change Terraform: fmt, validate, plan (no apply) |
| [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) | Merge / tag / manual: apply + Hosting deploy |

Local checks: `pnpm terraform:fmt:check` (also in `pnpm precommit` and root `pnpm format:check`).

## Layout

```
terraform/
  main.tf              # API enablement
  workspaces.tf        # workspace → GCP project
  locals.tf            # Cloud Run scaling, Hosting URLs
  cloudrun.tf          # API service
  firestore.tf         # DB, rules, indexes (repo root JSON)
  firebase_hosting.tf
  firebase_project.tf
  backend-secrets.tf    # PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS (Secret Manager)
  iam.tf / ci_deployer.tf
  backend-configs/*.hcl
```
