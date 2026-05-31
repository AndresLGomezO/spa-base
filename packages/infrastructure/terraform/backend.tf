# Backend configuration is supplied at init time, e.g.:
#   terraform init -backend-config=backend-configs/dev.hcl
# See backend-configs/*.hcl and docs/infrastructure/terraform-state.md
terraform {
  backend "gcs" {}
}
