# Gmail ingest — API enablement, OAuth secrets, Cloud Tasks queue, Pub/Sub watch topic.
# OAuth consent screen + Web client remain a one-time Console step; Terraform creates
# Secret Manager shells only. Add versions before Cloud Run can start with secret refs:
#   gcloud secrets versions add GMAIL_OAUTH_CLIENT_ID --project=PROJECT_ID --data-file=-
#   gcloud secrets versions add GMAIL_OAUTH_CLIENT_SECRET --project=PROJECT_ID --data-file=-
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | \
#     gcloud secrets versions add GMAIL_OAUTH_STATE_SECRET --project=PROJECT_ID --data-file=-

resource "google_project_service" "gmail_api" {
  project            = local.gcp_project_id
  service            = "gmail.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "pubsub_api_gmail" {
  count = local.enable_ai_worker ? 1 : 0

  project            = local.gcp_project_id
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_secret_manager_secret" "gmail_oauth_client_id" {
  secret_id = "GMAIL_OAUTH_CLIENT_ID"
  project   = local.gcp_project_id

  labels = {
    managed_by  = "terraform"
    environment = local.workspace
    component   = "gmail-ingest"
  }

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret" "gmail_oauth_client_secret" {
  secret_id = "GMAIL_OAUTH_CLIENT_SECRET"
  project   = local.gcp_project_id

  labels = {
    managed_by  = "terraform"
    environment = local.workspace
    component   = "gmail-ingest"
  }

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret" "gmail_oauth_state_secret" {
  secret_id = "GMAIL_OAUTH_STATE_SECRET"
  project   = local.gcp_project_id

  labels = {
    managed_by  = "terraform"
    environment = local.workspace
    component   = "gmail-ingest"
  }

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager_api]
}

resource "google_cloud_tasks_queue" "gmail_jobs" {
  count = local.enable_ai_worker ? 1 : 0

  name     = "${local.app_name}-gmail-jobs-queue-${local.prefix}"
  location = var.region

  rate_limits {
    # Keep low: email hooks update shared parents (schedules / financial items).
    # Higher concurrency causes Firestore "Transaction lock timeout" during backfill.
    max_dispatches_per_second = 5
    max_concurrent_dispatches = 2
  }

  retry_config {
    max_attempts       = 5
    max_retry_duration = "600s"
  }

  depends_on = [google_project_service.cloudtasks_api]
}

resource "google_cloud_tasks_queue_iam_member" "backend_gmail_enqueuer" {
  count = local.enable_ai_worker ? 1 : 0

  name   = google_cloud_tasks_queue.gmail_jobs[0].name
  role   = "roles/cloudtasks.enqueuer"
  member = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_cloud_tasks_queue_iam_member" "worker_gmail_enqueuer" {
  count = local.enable_ai_worker ? 1 : 0

  name   = google_cloud_tasks_queue.gmail_jobs[0].name
  role   = "roles/cloudtasks.enqueuer"
  member = "serviceAccount:${google_service_account.worker_service_sa[0].email}"
}

resource "google_pubsub_topic" "gmail_push" {
  count = local.enable_ai_worker ? 1 : 0

  project = local.gcp_project_id
  name    = "gmail-push"

  depends_on = [google_project_service.pubsub_api_gmail]
}

# Gmail API publishes watch notifications via this Google-managed service account.
resource "google_pubsub_topic_iam_member" "gmail_api_push_publisher" {
  count = local.enable_ai_worker ? 1 : 0

  project = local.gcp_project_id
  topic   = google_pubsub_topic.gmail_push[0].name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:gmail-api-push@system.gserviceaccount.com"
}

resource "google_pubsub_subscription" "gmail_push_api" {
  count = local.enable_ai_worker ? 1 : 0

  project = local.gcp_project_id
  name    = "gmail-push-api"
  topic   = google_pubsub_topic.gmail_push[0].id

  ack_deadline_seconds       = 60
  message_retention_duration = "86400s"

  push_config {
    push_endpoint = "${local.backend_url_full}/api/gmail/pubsub"
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  depends_on = [google_cloud_run_v2_service.backend]
}

resource "google_project_iam_member" "worker_service_secrets" {
  count = local.enable_ai_worker ? 1 : 0

  project = local.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.worker_service_sa[0].email}"
}

# ---------------------------------------------------------------------------
# Gmail poll (Cloud Scheduler → worker /tasks/gmail-poll every 5 minutes)
# Always created; worker no-ops when GMAIL_INGEST_DELIVERY_MODE=push.
# ---------------------------------------------------------------------------

resource "google_project_service" "cloudscheduler_api" {
  count = local.enable_ai_worker ? 1 : 0

  project            = local.gcp_project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_service_account_iam_member" "scheduler_act_as_tasks_sa" {
  count = local.enable_ai_worker ? 1 : 0

  service_account_id = google_service_account.tasks_sa[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"

  depends_on = [google_project_service.cloudscheduler_api]
}

resource "google_cloud_scheduler_job" "gmail_poll" {
  count = local.enable_ai_worker ? 1 : 0

  name             = "${local.app_name}-gmail-poll-${local.prefix}"
  description      = "Poll connected Gmail mailboxes for history sync (every 5 minutes)"
  schedule         = "*/5 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "${local.worker_service_url_full}/tasks/gmail-poll"
    headers = {
      "Content-Type" = "application/json"
    }
    body = base64encode("{}")

    oidc_token {
      service_account_email = google_service_account.tasks_sa[0].email
      audience              = local.worker_service_url_full
    }
  }

  depends_on = [
    google_project_service.cloudscheduler_api,
    google_cloud_run_v2_service.worker_service[0],
    google_service_account_iam_member.scheduler_act_as_tasks_sa[0],
    google_cloud_run_v2_service_iam_member.tasks_sa_worker_invoker[0],
  ]
}

# ---------------------------------------------------------------------------
# Schedule tick (Cloud Scheduler → worker /tasks/schedule-tick every minute)
# Runs due cron data-hooks: categorize, enrich, evaluate, generate insights, …
# ---------------------------------------------------------------------------

resource "google_cloud_scheduler_job" "schedule_tick" {
  count = local.enable_ai_worker ? 1 : 0

  name             = "${local.app_name}-schedule-tick-${local.prefix}"
  description      = "Run due scheduled data hooks (every minute)"
  schedule         = "* * * * *"
  time_zone        = "UTC"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "${local.worker_service_url_full}/tasks/schedule-tick"
    headers = {
      "Content-Type" = "application/json"
    }
    body = base64encode("{}")

    oidc_token {
      service_account_email = google_service_account.tasks_sa[0].email
      audience              = local.worker_service_url_full
    }
  }

  depends_on = [
    google_project_service.cloudscheduler_api,
    google_cloud_run_v2_service.worker_service[0],
    google_service_account_iam_member.scheduler_act_as_tasks_sa[0],
    google_cloud_run_v2_service_iam_member.tasks_sa_worker_invoker[0],
  ]
}

