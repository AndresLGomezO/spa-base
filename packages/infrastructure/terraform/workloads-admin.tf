# Workload Manager — IAM grants for the API backend_sa to manage
# Cloud Tasks queues, Cloud Scheduler jobs, Pub/Sub resources, and
# read Cloud Logging entries for workload run drill-down.

resource "google_project_iam_member" "backend_cloudtasks_queue_admin" {
  project = local.gcp_project_id
  role    = "roles/cloudtasks.admin"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "backend_cloudscheduler_admin" {
  project = local.gcp_project_id
  role    = "roles/cloudscheduler.admin"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "backend_pubsub_admin" {
  project = local.gcp_project_id
  role    = "roles/pubsub.admin"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "backend_logging_viewer" {
  project = local.gcp_project_id
  role    = "roles/logging.viewer"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

# cloudscheduler.googleapis.com — already enabled in gmail-ingest.tf (google_project_service.cloudscheduler_api)
# cloudtasks.googleapis.com   — already enabled in cloudtasks-ai-jobs.tf (google_project_service.cloudtasks_api)
# logging.googleapis.com      — enabled by default on all GCP projects
