# PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS — comma-separated emails for first-login superadmin promotion.
# Terraform creates the secret and an initial version from bootstrap_superadmin_emails_placeholder.
# Update the value anytime in Console or:
#   gcloud secrets versions add PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS \
#     --project=PROJECT_ID --data-file=-
# Terraform ignores secret_data after the first version (lifecycle ignore_changes).
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

resource "google_secret_manager_secret_version" "bootstrap_superadmin_emails" {
  secret      = google_secret_manager_secret.bootstrap_superadmin_emails.id
  secret_data = var.bootstrap_superadmin_emails_placeholder

  lifecycle {
    ignore_changes = [secret_data]
  }
}
