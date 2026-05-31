# Terraform remote state

Terraform state is stored in **GCS**, one bucket per GCP project (project-per-environment).

## Backend configuration

Init with the backend config for the environment:

```bash
cd packages/infrastructure/terraform

terraform init -backend-config=backend-configs/dev.hcl
terraform workspace select -or-create dev
```

| Environment | Backend config | State bucket | GCP project |
| ----------- | -------------- | ------------ | ----------- |
| dev | `backend-configs/dev.hcl` | `entitysystem-development-terraform-state` | `entitysystem-development` |
| staging | `backend-configs/staging.hcl` | `entitysystem-staging-terraform-state` | `entitysystem-staging` |
| prod | `backend-configs/prod.hcl` | `entitysystem-production-terraform-state` | `entitysystem-production` |

All backends use prefix `terraform/state`. **Workspace names** (`dev`, `staging`, `prod`) isolate state within the bucket.

## Create state buckets (first time)

From repo root, with credentials that can create buckets in the project:

```bash
bash scripts/ensure-terraform-state-bucket.sh \
  entitysystem-development-terraform-state \
  entitysystem-development \
  us-central1
```

Repeat for `entitysystem-staging` and `entitysystem-production` with their bucket names.

CI runs the same script before `terraform init` in the deploy workflow.

## Switching environments locally

Re-init with a different backend config (use `-reconfigure` when changing buckets):

```bash
terraform init -reconfigure -backend-config=backend-configs/staging.hcl
terraform workspace select -or-create staging
```

## Drift and Firestore indexes

- Firestore **rules** and **indexes** are managed by Terraform from repo root `firestore.rules` and `firestore.indexes.json`.
- If apply fails with `index already exists`, wait for index deletion to propagate (~2 minutes) and re-apply (deploy workflow retries once).

## Optional project override

For local testing only:

```bash
terraform plan -var='project_id=my-other-project'
```

Leave `project_id` empty in CI; the workspace selects the canonical project in `workspaces.tf`.
