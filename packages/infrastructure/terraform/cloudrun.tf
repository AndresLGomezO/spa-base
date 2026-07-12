# API (backend) Cloud Run service — scale-to-zero MVP.
resource "google_cloud_run_v2_service" "backend" {
  name                = local.backend_service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  depends_on = [
    google_firebase_project.default,
    google_project_service.run_api,
    google_project_service.gmail_api,
    google_secret_manager_secret.bootstrap_superadmin_emails,
    google_secret_manager_secret.tenant_encryption_master_key,
    google_secret_manager_secret.gmail_oauth_client_id,
    google_secret_manager_secret.gmail_oauth_client_secret,
    google_secret_manager_secret.gmail_oauth_state_secret,
    google_project_iam_member.backend_firestore,
    google_project_iam_member.backend_secrets,
    google_project_iam_member.backend_firebase_auth,
    google_project_iam_member.backend_storage,
    google_service_account_iam_member.ci_deployer_act_as_backend_sa,
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
        initial_delay_seconds = 20
        period_seconds        = 5
        timeout_seconds       = 3
        failure_threshold     = 12
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
        name  = "ENSURE_FIRESTORE_INDEXES"
        value = local.environment_config.ensure_firestore_indexes
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
        name  = "SKIP_PLATFORM_STARTUP_SEEDS"
        value = "true"
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
      env {
        name = "TENANT_ENCRYPTION_MASTER_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.tenant_encryption_master_key.secret_id
            version = "latest"
          }
        }
      }

      dynamic "env" {
        for_each = local.enable_aggregation_pubsub ? [1] : []
        content {
          name  = "AGGREGATION_EVENTS_PUBSUB"
          value = "true"
        }
      }

      dynamic "env" {
        for_each = local.enable_aggregation_pubsub ? [1] : []
        content {
          name  = "AGGREGATION_EVENTS_TOPIC"
          value = google_pubsub_topic.aggregation_events[0].name
        }
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "WORKER_SERVICE_URL"
          value = local.worker_service_url_full
        }
      }

      dynamic "env" {
        for_each = local.enable_observability_traces ? [1] : []
        content {
          name  = "ENABLE_PERF_LOGS"
          value = "true"
        }
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "CLOUD_TASKS_QUEUE_NAME"
          value = google_cloud_tasks_queue.ai_jobs[0].name
        }
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "TASKS_SA_EMAIL"
          value = google_service_account.tasks_sa[0].email
        }
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "GCP_REGION"
          value = var.region
        }
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "AI_TASKS_LOCAL_DISPATCH"
          value = "false"
        }
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "HOOK_TASKS_QUEUE_NAME"
          value = google_cloud_tasks_queue.hook_jobs[0].name
        }
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "HOOK_TASKS_LOCAL_DISPATCH"
          value = "false"
        }
      }

      env {
        name = "GMAIL_OAUTH_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gmail_oauth_client_id.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GMAIL_OAUTH_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gmail_oauth_client_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GMAIL_OAUTH_STATE_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gmail_oauth_state_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "GMAIL_OAUTH_REDIRECT_URI"
        value = "${local.backend_url_full}/api/gmail/oauth/callback"
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "GMAIL_PUBSUB_TOPIC"
          value = google_pubsub_topic.gmail_push[0].id
        }
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "GMAIL_TASKS_QUEUE_NAME"
          value = google_cloud_tasks_queue.gmail_jobs[0].name
        }
      }

      dynamic "env" {
        for_each = local.enable_ai_worker ? [1] : []
        content {
          name  = "GMAIL_TASKS_LOCAL_DISPATCH"
          value = "false"
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
