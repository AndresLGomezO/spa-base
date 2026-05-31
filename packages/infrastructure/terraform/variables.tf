variable "project_id" {
  description = "Optional override of the workspace default GCP project ID (for local testing). Leave empty in CI."
  type        = string
  default     = ""
}

variable "region" {
  description = "The GCP region for Cloud Run, Artifact Registry, and regional resources."
  type        = string
  default     = "us-central1"
}

variable "repository_name" {
  description = "Artifact Registry Docker repository id. Must match GitHub variable GCP_REPOSITORY_NAME."
  type        = string
  default     = "entitysystem-repo"
}

variable "db_location_id" {
  description = "Location for Firestore (e.g. nam5 for multi-region or us-central1)."
  type        = string
  default     = "nam5"
}

variable "api_image" {
  description = "Docker image URI for the API Cloud Run service. Set by CI on every deploy."
  type        = string
  default     = "us-central1-docker.pkg.dev/entitysystem-development/entitysystem-repo/api:latest"
}

variable "ci_deployer_sa_email" {
  description = "GitHub Actions deployer service account email. When set, Terraform grants actAs on runtime and legacy Firebase deploy identities."
  type        = string
  default     = ""
}

variable "bootstrap_superadmin_emails_placeholder" {
  description = "Initial Secret Manager value for PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS (comma-separated emails). Replaced via Console or `gcloud secrets versions add` later; Terraform ignores secret_data after create."
  type        = string
  sensitive   = true
  default     = ""
}

variable "firestore_collection_prefix" {
  description = "Override Firestore collection prefix for composite indexes (PR previews). When null, no prefix is applied."
  type        = string
  default     = null
}
