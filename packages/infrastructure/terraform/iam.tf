resource "google_service_account" "backend_sa" {
  account_id   = "${local.app_name}-backend-sa-${local.prefix}"
  display_name = "Entity System API runtime"
}

resource "google_project_iam_member" "backend_firestore" {
  project = local.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "backend_firestore_index_admin" {
  project = local.gcp_project_id
  role    = "roles/datastore.indexAdmin"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "backend_firebase_auth" {
  project = local.gcp_project_id
  role    = "roles/firebaseauth.admin"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "backend_secrets" {
  project = local.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_service_account_iam_member" "backend_token_creator" {
  service_account_id = google_service_account.backend_sa.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Tenant logo uploads use the default Firebase Storage bucket ({project}.appspot.com).
resource "google_project_iam_member" "backend_storage" {
  project = local.gcp_project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}
