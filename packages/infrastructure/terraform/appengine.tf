# App Engine application creates the default appspot service account
# ({project_id}@appspot.gserviceaccount.com), required for Firebase CLI actAs bindings.
resource "google_app_engine_application" "default" {
  project     = local.gcp_project_id
  location_id = "us-central"

  depends_on = [google_project_service.appengine_api]
}
