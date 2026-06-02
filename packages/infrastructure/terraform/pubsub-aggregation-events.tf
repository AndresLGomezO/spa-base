resource "google_project_service" "pubsub_api_aggregation" {
  count = local.enable_aggregation_pubsub ? 1 : 0

  project = local.gcp_project_id
  service = "pubsub.googleapis.com"

  disable_on_destroy = false
}

resource "google_pubsub_topic" "aggregation_events" {
  count = local.enable_aggregation_pubsub ? 1 : 0

  project = local.gcp_project_id
  name    = "aggregation-events"

  depends_on = [google_project_service.pubsub_api_aggregation]
}

resource "google_pubsub_subscription" "aggregation_events_worker" {
  count = local.enable_aggregation_pubsub ? 1 : 0

  project = local.gcp_project_id
  name    = "aggregation-events-worker"
  topic   = google_pubsub_topic.aggregation_events[0].id

  ack_deadline_seconds       = 60
  message_retention_duration = "86400s"

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

resource "google_service_account" "worker_aggregation_sa" {
  count = local.enable_aggregation_pubsub ? 1 : 0

  account_id   = "${local.app_name}-worker-agg-sa-${local.prefix}"
  display_name = "Entity System aggregation worker"
}

resource "google_project_iam_member" "backend_aggregation_pubsub_publisher" {
  count = local.enable_aggregation_pubsub ? 1 : 0

  project = local.gcp_project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "worker_aggregation_pubsub_subscriber" {
  count = local.enable_aggregation_pubsub ? 1 : 0

  project = local.gcp_project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.worker_aggregation_sa[0].email}"
}

resource "google_project_iam_member" "worker_aggregation_firestore" {
  count = local.enable_aggregation_pubsub ? 1 : 0

  project = local.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.worker_aggregation_sa[0].email}"
}

resource "google_service_account_iam_member" "ci_deployer_act_as_worker_aggregation_sa" {
  count = local.enable_aggregation_pubsub && var.ci_deployer_sa_email != "" ? 1 : 0

  service_account_id = google_service_account.worker_aggregation_sa[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.ci_deployer_sa_email}"
}
