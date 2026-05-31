# Dev/default: dedicated Hosting site (globally unique site_id; see locals.firebase_hosting_dev_site_id).
# Staging/prod: use the default site (site_id = project_id).
resource "google_firebase_hosting_site" "dev" {
  count    = contains(["dev", "default"], local.workspace) ? 1 : 0
  provider = google-beta
  project  = local.gcp_project_id
  site_id  = local.firebase_hosting_dev_site_id

  depends_on = [
    google_firebase_project.default,
    google_project_service.firebasehosting_api,
  ]
}
