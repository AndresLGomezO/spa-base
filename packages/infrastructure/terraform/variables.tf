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

variable "firestore_collection_prefix" {
  description = "Override Firestore collection prefix for composite indexes (PR previews). When null, no prefix is applied."
  type        = string
  default     = null
}

variable "worker_aggregation_image" {
  description = "Docker image URI for the aggregation worker Cloud Run service. Set by CI on every deploy."
  type        = string
  default     = "us-central1-docker.pkg.dev/entitysystem-development/entitysystem-repo/worker-aggregation:latest"
}

variable "worker_service_image" {
  description = "Docker image URI for the AI worker Cloud Run service. Set by CI on every deploy."
  type        = string
  default     = "us-central1-docker.pkg.dev/entitysystem-development/entitysystem-repo/worker-service:latest"
}

variable "vertex_location" {
  description = "Vertex AI location for Gemini generateContent (VERTEX_LOCATION). Gemini 3.x preview models require global."
  type        = string
  default     = "global"
}

variable "vertex_gemini_model_id" {
  description = "Default Vertex AI Gemini model id for the AI worker (VERTEX_MODEL_ID). Used for classify, chat, UI builder, Gmail extract."
  type        = string
  default     = "gemini-3.6-flash"
}

variable "vertex_gemini_reasoning_model_id" {
  description = "Vertex AI Gemini model id for demanding narrative / contract JSON summaries (VERTEX_REASONING_MODEL_ID)."
  type        = string
  default     = "gemini-3.1-pro-preview"
}

variable "enable_ai_worker" {
  description = "Create Cloud Tasks queue, AI worker Cloud Run, and backend enqueue IAM."
  type        = bool
  default     = true
}

variable "enable_aggregation_pubsub" {
  description = "Create Pub/Sub topic, subscription, worker Cloud Run, and backend publish IAM for aggregation events."
  type        = bool
  default     = true
}

variable "enable_observability_traces" {
  description = "Set ENABLE_PERF_LOGS and AI_STEP_TRACE_ENABLED on Cloud Run services (dev default). Runtime Platform toggles can override without redeploy."
  type        = bool
  default     = false
}
