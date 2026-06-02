# Aggregation worker — long-running Pub/Sub pull subscriber on Cloud Run.
resource "google_cloud_run_v2_service" "worker_aggregation" {
  count = local.enable_aggregation_pubsub ? 1 : 0

  name                = "${local.app_name}-worker-aggregation-${local.prefix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  deletion_protection = false

  depends_on = [
    google_firebase_project.default,
    google_project_service.run_api,
    google_pubsub_subscription.aggregation_events_worker,
    google_project_iam_member.worker_aggregation_firestore,
    google_project_iam_member.worker_aggregation_pubsub_subscriber,
    google_service_account_iam_member.ci_deployer_act_as_worker_aggregation_sa,
  ]

  template {
    service_account = google_service_account.worker_aggregation_sa[0].email
    timeout         = local.current_config.worker_timeout

    containers {
      image = local.worker_aggregation_image

      ports {
        container_port = 8080
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
          port = 8080
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        timeout_seconds       = 3
        failure_threshold     = 12
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
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
        name  = "PORT"
        value = "8080"
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
        name  = "AGGREGATION_EVENTS_TOPIC"
        value = google_pubsub_topic.aggregation_events[0].name
      }
      env {
        name  = "AGGREGATION_EVENTS_SUBSCRIPTION"
        value = google_pubsub_subscription.aggregation_events_worker[0].name
      }
    }

    scaling {
      min_instance_count = local.current_config.worker_min_instances
      max_instance_count = local.current_config.worker_max_instances
    }
  }
}
