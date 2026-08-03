output "gcp_project_id" {
  description = "GCP project ID for this workspace"
  value       = local.gcp_project_id
}

output "backend_url" {
  description = "Cloud Run API URL (use for VITE_API_URL)"
  value       = local.backend_url_full
}

output "frontend_url" {
  description = "Primary Firebase Hosting URL for this workspace"
  value       = local.firebase_hosting_primary_url
}

output "firebase_hosting_url" {
  description = "Alias for frontend_url"
  value       = local.firebase_hosting_primary_url
}

output "firebase_hosting_site_id" {
  description = "Firebase Hosting site ID for firebase target:apply hosting live (default site = project_id)"
  value       = local.gcp_project_id
}

output "artifact_registry_url" {
  description = "Artifact Registry base URL (without image name/tag)"
  value       = local.artifact_registry_url
}

output "default_storage_bucket" {
  description = "Default Firebase/GCS bucket for tenant logo uploads"
  value       = local.default_storage_bucket
}

output "bootstrap_superadmin_emails_secret_id" {
  description = "Secret Manager secret id for PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS (update value in Console or gcloud; Cloud Run uses latest)"
  value       = google_secret_manager_secret.bootstrap_superadmin_emails.secret_id
}

output "tenant_encryption_master_key_secret_id" {
  description = "Secret Manager secret id for TENANT_ENCRYPTION_MASTER_KEY (update value in Console or gcloud; Cloud Run uses latest)"
  value       = google_secret_manager_secret.tenant_encryption_master_key.secret_id
}

output "aggregation_pubsub_topic" {
  description = "Pub/Sub topic for aggregation events (empty when disabled)"
  value       = local.enable_aggregation_pubsub ? google_pubsub_topic.aggregation_events[0].name : ""
}

output "worker_aggregation_service_name" {
  description = "Cloud Run service name for the aggregation worker (empty when disabled)"
  value       = local.enable_aggregation_pubsub ? google_cloud_run_v2_service.worker_aggregation[0].name : ""
}

output "worker_service_url" {
  description = "Cloud Run URL for the AI worker service (empty when disabled)"
  value       = local.worker_service_url_full
}

output "ai_jobs_queue_name" {
  description = "Cloud Tasks queue for AI jobs (empty when disabled)"
  value       = local.enable_ai_worker ? google_cloud_tasks_queue.ai_jobs[0].name : ""
}

output "hook_jobs_queue_name" {
  description = "Cloud Tasks queue for data hook jobs (empty when disabled)"
  value       = local.enable_ai_worker ? google_cloud_tasks_queue.hook_jobs[0].name : ""
}

output "document_extraction_queue_name" {
  description = "Cloud Tasks queue for document extraction jobs (empty when disabled)"
  value       = local.enable_ai_worker ? google_cloud_tasks_queue.document_extraction[0].name : ""
}

output "gmail_jobs_queue_name" {
  description = "Cloud Tasks queue for Gmail ingest jobs (empty when disabled)"
  value       = local.enable_ai_worker ? google_cloud_tasks_queue.gmail_jobs[0].name : ""
}

output "gmail_pubsub_topic" {
  description = "Full Pub/Sub topic id for Gmail watch push (empty when disabled)"
  value       = local.enable_ai_worker ? google_pubsub_topic.gmail_push[0].id : ""
}

output "gmail_oauth_client_id_secret_id" {
  description = "Secret Manager secret id for GMAIL_OAUTH_CLIENT_ID"
  value       = google_secret_manager_secret.gmail_oauth_client_id.secret_id
}

output "gmail_oauth_client_secret_secret_id" {
  description = "Secret Manager secret id for GMAIL_OAUTH_CLIENT_SECRET"
  value       = google_secret_manager_secret.gmail_oauth_client_secret.secret_id
}

output "gmail_oauth_state_secret_secret_id" {
  description = "Secret Manager secret id for GMAIL_OAUTH_STATE_SECRET"
  value       = google_secret_manager_secret.gmail_oauth_state_secret.secret_id
}
