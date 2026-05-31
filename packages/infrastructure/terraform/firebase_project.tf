# Link the GCP project to Firebase (required before Hosting and client SDK usage).
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = local.gcp_project_id

  depends_on = [
    google_project_service.firebase_api,
    google_project_service.firebasehosting_api,
    google_project_service.identitytoolkit_api,
  ]
}
