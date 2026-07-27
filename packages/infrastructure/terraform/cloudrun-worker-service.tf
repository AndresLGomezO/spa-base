# AI worker — Cloud Tasks HTTP target on Cloud Run.
resource "google_cloud_run_v2_service" "worker_service" {
  count = local.enable_ai_worker ? 1 : 0

  name                = local.worker_service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  deletion_protection = false

  depends_on = [
    google_firebase_project.default,
    google_project_service.run_api,
    google_cloud_tasks_queue.ai_jobs,
    google_cloud_tasks_queue.gmail_jobs,
    google_secret_manager_secret.tenant_encryption_master_key,
    google_secret_manager_secret.gmail_oauth_client_id,
    google_secret_manager_secret.gmail_oauth_client_secret,
    google_project_iam_member.worker_service_firestore,
    google_project_iam_member.worker_service_firebase_cloud_messaging,
    google_project_iam_member.worker_service_vertex_ai,
    google_project_iam_member.worker_service_storage,
    google_project_iam_member.worker_service_secrets,
    google_service_account_iam_member.ci_deployer_act_as_worker_service_sa,
    google_project_service.aiplatform_api,
    google_project_service.gmail_api,
  ]

  template {
    service_account = google_service_account.worker_service_sa[0].email
    timeout         = local.current_config.worker_timeout

    containers {
      image = local.worker_service_image

      ports {
        container_port = 3001
      }

      resources {
        limits = {
          cpu    = local.current_config.worker_cpu
          memory = local.current_config.worker_memory
        }
        cpu_idle          = local.current_config.worker_cpu_idle
        startup_cpu_boost = local.current_config.startup_cpu_boost
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 3001
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        timeout_seconds       = 3
        failure_threshold     = 12
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 3001
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
        name  = "GCP_PROJECT_ID"
        value = local.gcp_project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
      env {
        name  = "VERTEX_LOCATION"
        value = var.vertex_location
      }
      env {
        name  = "GCP_STORAGE_BUCKET"
        value = local.default_storage_bucket
      }
      env {
        name  = "VERTEX_MODEL_ID"
        value = var.vertex_gemini_model_id
      }
      env {
        name  = "VERTEX_REASONING_MODEL_ID"
        value = var.vertex_gemini_reasoning_model_id
      }
      env {
        name  = "TASKS_SA_EMAIL"
        value = google_service_account.tasks_sa[0].email
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
        name  = "GMAIL_PUBSUB_TOPIC"
        value = google_pubsub_topic.gmail_push[0].id
      }
      env {
        name  = "GMAIL_INGEST_DELIVERY_MODE"
        value = "poll"
      }
      env {
        name  = "GMAIL_TASKS_QUEUE_NAME"
        value = google_cloud_tasks_queue.gmail_jobs[0].name
      }
      env {
        name  = "AI_EMBED_TASKS_QUEUE_NAME"
        value = google_cloud_tasks_queue.ai_embed[0].name
      }
      env {
        name  = "GMAIL_TASKS_LOCAL_DISPATCH"
        value = "false"
      }
      env {
        name  = "WORKER_SERVICE_URL"
        value = local.worker_service_url_full
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
        for_each = local.enable_observability_traces ? [1] : []
        content {
          name  = "AI_STEP_TRACE_ENABLED"
          value = "true"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = local.current_config.worker_max_instances
    }
  }
}
