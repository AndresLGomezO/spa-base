resource "google_project_service" "pubsub_api" {
  count = var.enable_index_provisioning_pubsub ? 1 : 0

  project = local.gcp_project_id
  service = "pubsub.googleapis.com"

  disable_on_destroy = false
}

resource "google_pubsub_topic" "index_provisioning" {
  count = var.enable_index_provisioning_pubsub ? 1 : 0

  project = local.gcp_project_id
  name    = "index-provisioning"

  depends_on = [google_project_service.pubsub_api]
}

resource "google_project_iam_member" "backend_pubsub_publisher" {
  count = var.enable_index_provisioning_pubsub ? 1 : 0

  project = local.gcp_project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "backend_pubsub_subscriber" {
  count = var.enable_index_provisioning_pubsub ? 1 : 0

  project = local.gcp_project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}
