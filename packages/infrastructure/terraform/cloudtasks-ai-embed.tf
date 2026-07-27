resource "google_cloud_tasks_queue" "ai_embed" {
  count = local.enable_ai_worker ? 1 : 0

  name     = "${local.app_name}-ai-embed-queue-${local.prefix}"
  location = var.region

  rate_limits {
    # Prod keeps higher throughput; non-prod (single-user) caps Vertex embedding fan-out.
    max_dispatches_per_second = local.workspace == "prod" ? 10 : 5
    max_concurrent_dispatches = local.workspace == "prod" ? 20 : 5
  }

  retry_config {
    max_attempts       = 5
    max_retry_duration = "600s"
  }

  depends_on = [google_project_service.cloudtasks_api]
}

resource "google_cloud_tasks_queue_iam_member" "backend_ai_embed_enqueuer" {
  count = local.enable_ai_worker ? 1 : 0

  name   = google_cloud_tasks_queue.ai_embed[0].name
  role   = "roles/cloudtasks.enqueuer"
  member = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_cloud_tasks_queue_iam_member" "worker_ai_embed_enqueuer" {
  count = local.enable_ai_worker ? 1 : 0

  name   = google_cloud_tasks_queue.ai_embed[0].name
  role   = "roles/cloudtasks.enqueuer"
  member = "serviceAccount:${google_service_account.worker_service_sa[0].email}"
}
