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

# TENANT_ENCRYPTION_MASTER_KEY — 256-bit base64 key for field-level encryption.
# Used to derive per-tenant AES-256-GCM keys via HKDF. Changing this key
# invalidates all previously encrypted data.
# Terraform creates the secret only. Add the first version before Cloud Run deploy:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" | \
#     gcloud secrets versions add TENANT_ENCRYPTION_MASTER_KEY \
#       --project=PROJECT_ID --data-file=-
resource "google_secret_manager_secret" "tenant_encryption_master_key" {
  secret_id = "TENANT_ENCRYPTION_MASTER_KEY"
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
