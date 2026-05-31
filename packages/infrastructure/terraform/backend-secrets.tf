# PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS — comma-separated emails for first-login superadmin promotion.
# Terraform creates the secret only. Add the first version before Cloud Run deploy:
#   gcloud secrets versions add PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS \
#     --project=PROJECT_ID --data-file=-
resource "google_secret_manager_secret" "bootstrap_superadmin_emails" {
  secret_id = "PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS"
  project   = local.gcp_project_id

  labels = {
    managed_by  = "terraform"
    environment = local.workspace
    component   = "api"
  }

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager_api]
}
