resource "google_cloud_tasks_queue" "hook_jobs" {
  count = local.enable_ai_worker ? 1 : 0

  name     = "${local.app_name}-hook-jobs-queue-${local.prefix}"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 50
    max_concurrent_dispatches = 20
  }

  retry_config {
    max_attempts       = 5
    max_retry_duration = "600s"
  }

  depends_on = [google_project_service.cloudtasks_api]
}

resource "google_cloud_tasks_queue_iam_member" "backend_hook_enqueuer" {
  count = local.enable_ai_worker ? 1 : 0

  name   = google_cloud_tasks_queue.hook_jobs[0].name
  role   = "roles/cloudtasks.enqueuer"
  member = "serviceAccount:${google_service_account.backend_sa.email}"
}
