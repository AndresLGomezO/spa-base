resource "google_project_service" "cloudkms_api" {
  count = local.enable_ai_worker ? 1 : 0

  project            = local.gcp_project_id
  service            = "cloudkms.googleapis.com"
  disable_on_destroy = false
}

resource "google_kms_key_ring" "document_extractions" {
  count = local.enable_ai_worker ? 1 : 0

  name     = "${local.app_name}-document-extractions-${local.prefix}"
  location = var.region
  project  = local.gcp_project_id

  depends_on = [google_project_service.cloudkms_api]
}

resource "google_kms_crypto_key" "statement_payload" {
  count = local.enable_ai_worker ? 1 : 0

  name            = "statement-payload"
  key_ring        = google_kms_key_ring.document_extractions[0].id
  rotation_period = "7776000s" # 90 days

  purpose = "ENCRYPT_DECRYPT"

  version_template {
    algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key_iam_member" "worker_statement_payload_encrypter_decrypter" {
  count = local.enable_ai_worker ? 1 : 0

  crypto_key_id = google_kms_crypto_key.statement_payload[0].id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.worker_service_sa[0].email}"
}

resource "google_kms_crypto_key_iam_member" "backend_statement_payload_decrypter" {
  count = local.enable_ai_worker ? 1 : 0

  crypto_key_id = google_kms_crypto_key.statement_payload[0].id
  role          = "roles/cloudkms.cryptoKeyDecrypter"
  member        = "serviceAccount:${google_service_account.backend_sa.email}"
}
