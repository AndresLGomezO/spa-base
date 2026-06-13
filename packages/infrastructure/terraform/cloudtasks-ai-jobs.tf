resource "google_project_service" "cloudtasks_api" {
  count = local.enable_ai_worker ? 1 : 0

  project            = local.gcp_project_id
  service            = "cloudtasks.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "aiplatform_api" {
  count = local.enable_ai_worker ? 1 : 0

  project            = local.gcp_project_id
  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}

resource "google_cloud_tasks_queue" "ai_jobs" {
  count = local.enable_ai_worker ? 1 : 0

  name     = "${local.app_name}-ai-jobs-queue-${local.prefix}"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 0.1667 # ~10 per minute
    max_concurrent_dispatches = 5
  }

  retry_config {
    max_attempts       = 5
    max_retry_duration = "600s"
  }

  depends_on = [google_project_service.cloudtasks_api]
}

resource "google_service_account" "worker_service_sa" {
  count = local.enable_ai_worker ? 1 : 0

  account_id   = "${local.app_name}-worker-svc-sa-${local.prefix}"
  display_name = "Entity System AI worker service"
}

resource "google_service_account" "tasks_sa" {
  count = local.enable_ai_worker ? 1 : 0

  account_id   = "${local.app_name}-tasks-sa-${local.prefix}"
  display_name = "Entity System Cloud Tasks OIDC identity"
}

resource "google_cloud_tasks_queue_iam_member" "backend_ai_enqueuer" {
  count = local.enable_ai_worker ? 1 : 0

  name   = google_cloud_tasks_queue.ai_jobs[0].name
  role   = "roles/cloudtasks.enqueuer"
  member = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "worker_service_firestore" {
  count = local.enable_ai_worker ? 1 : 0

  project = local.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.worker_service_sa[0].email}"
}

resource "google_project_iam_member" "worker_service_vertex_ai" {
  count = local.enable_ai_worker ? 1 : 0

  project = local.gcp_project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.worker_service_sa[0].email}"
}

resource "google_cloud_run_v2_service_iam_member" "tasks_sa_worker_invoker" {
  count = local.enable_ai_worker ? 1 : 0

  name     = google_cloud_run_v2_service.worker_service[0].name
  location = google_cloud_run_v2_service.worker_service[0].location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.tasks_sa[0].email}"
}

resource "google_service_account_iam_member" "ci_deployer_act_as_worker_service_sa" {
  count = local.enable_ai_worker && var.ci_deployer_sa_email != "" ? 1 : 0

  service_account_id = google_service_account.worker_service_sa[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.ci_deployer_sa_email}"
}

resource "google_service_account_iam_member" "ci_deployer_act_as_tasks_sa" {
  count = local.enable_ai_worker && var.ci_deployer_sa_email != "" ? 1 : 0

  service_account_id = google_service_account.tasks_sa[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.ci_deployer_sa_email}"
}
