# Grants for GitHub Actions deployer SA (ci_deployer_sa_email).

resource "google_service_account_iam_member" "ci_deployer_act_as_backend_sa" {
  count              = var.ci_deployer_sa_email != "" ? 1 : 0
  service_account_id = google_service_account.backend_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.ci_deployer_sa_email}"
}

# Firebase CLI (hosting/storage deploy) may require actAs on legacy SAs.
resource "google_service_account_iam_member" "ci_deployer_act_as_appspot_default" {
  count              = var.ci_deployer_sa_email != "" ? 1 : 0
  service_account_id = "projects/${local.gcp_project_id}/serviceAccounts/${local.gcp_project_id}@appspot.gserviceaccount.com"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.ci_deployer_sa_email}"

  depends_on = [google_app_engine_application.default]
}

resource "google_service_account_iam_member" "ci_deployer_act_as_default_compute" {
  count              = var.ci_deployer_sa_email != "" ? 1 : 0
  service_account_id = "projects/${local.gcp_project_id}/serviceAccounts/${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.ci_deployer_sa_email}"
}
