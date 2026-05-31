# API (backend) Cloud Run service — scale-to-zero MVP.
resource "google_cloud_run_v2_service" "backend" {
  name                = "${local.app_name}-backend-service-${local.prefix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  depends_on = [
    google_firebase_project.default,
    google_project_service.run_api,
    google_secret_manager_secret.bootstrap_superadmin_emails,
  ]

  template {
    service_account                  = google_service_account.backend_sa.email
    max_instance_request_concurrency = local.current_config.max_instance_request_concurrency
    timeout                          = local.current_config.timeout

    containers {
      image = local.backend_image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = local.current_config.backend_cpu
          memory = local.current_config.backend_memory
        }
        cpu_idle          = local.current_config.cpu_idle
        startup_cpu_boost = local.current_config.startup_cpu_boost
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 3000
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        timeout_seconds       = 3
        failure_threshold     = 6
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 3000
        }
        period_seconds    = 30
        timeout_seconds   = 1
        failure_threshold = 3
      }

      env {
        name  = "NODE_ENV"
        value = local.environment_config.node_env
      }
      env {
        name  = "API_HOST"
        value = "0.0.0.0"
      }
      env {
        name  = "API_PORT"
        value = "3000"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = local.gcp_project_id
      }
      env {
        name  = "GCP_STORAGE_BUCKET"
        value = local.default_storage_bucket
      }
      env {
        name  = "API_CORS_ORIGINS"
        value = local.api_cors_origins
      }
      env {
        name = "PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.bootstrap_superadmin_emails.secret_id
            version = "latest"
          }
        }
      }
    }

    scaling {
      min_instance_count = local.current_config.backend_min_instances
      max_instance_count = local.current_config.max_instances
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
