resource "google_cloud_tasks_queue" "document_extraction" {
  count = local.enable_ai_worker ? 1 : 0

  name     = "${local.app_name}-document-extraction-queue-${local.prefix}"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 0.0833 # ~5 per minute
    max_concurrent_dispatches = 3
  }

  retry_config {
    max_attempts       = 5
    max_retry_duration = "600s"
  }

  depends_on = [google_project_service.cloudtasks_api]
}

resource "google_cloud_tasks_queue_iam_member" "backend_document_extraction_enqueuer" {
  count = local.enable_ai_worker ? 1 : 0

  name   = google_cloud_tasks_queue.document_extraction[0].name
  role   = "roles/cloudtasks.enqueuer"
  member = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Worker may also enqueue (e.g. Gmail attachment import → extraction).
resource "google_cloud_tasks_queue_iam_member" "worker_document_extraction_enqueuer" {
  count = local.enable_ai_worker ? 1 : 0

  name   = google_cloud_tasks_queue.document_extraction[0].name
  role   = "roles/cloudtasks.enqueuer"
  member = "serviceAccount:${google_service_account.worker_service_sa[0].email}"
}
