locals {
  backend_image            = var.api_image
  worker_aggregation_image = var.worker_aggregation_image

  enable_aggregation_pubsub = try(
    local.environment_config.enable_aggregation_pubsub,
    var.enable_aggregation_pubsub,
  )

  environment_tier = contains(["dev", "staging", "default"], local.workspace) ? "development" : (
    local.workspace == "prod" ? "production" : "development"
  )

  # Scale-to-zero MVP: min_instances=0 everywhere; cpu_idle reduces idle cost.
  cloud_run_configs = {
    development = {
      backend_min_instances            = 0
      max_instances                    = 2
      backend_cpu                      = "250m"
      backend_memory                   = "256Mi"
      cpu_idle                         = true
      startup_cpu_boost                = true
      timeout                          = "60s"
      max_instance_request_concurrency = 1
      worker_min_instances             = 1
      worker_max_instances             = 1
      # cpu_idle=false requires limits.cpu >= 1 on Cloud Run v2 (always-allocated / unthrottled).
      worker_cpu      = "1000m"
      worker_memory   = "256Mi"
      worker_cpu_idle = false
      worker_timeout  = "3600s"
    }
    production = {
      backend_min_instances            = 0
      max_instances                    = 5
      backend_cpu                      = "1000m"
      backend_memory                   = "512Mi"
      cpu_idle                         = true
      startup_cpu_boost                = true
      timeout                          = "60s"
      max_instance_request_concurrency = 40
      worker_min_instances             = 1
      worker_max_instances             = 1
      worker_cpu                       = "1000m"
      worker_memory                    = "256Mi"
      worker_cpu_idle                  = false
      worker_timeout                   = "3600s"
    }
  }

  current_config = local.cloud_run_configs[local.environment_tier]

  default_storage_bucket = "${local.gcp_project_id}.appspot.com"

  backend_url_full = "https://${google_cloud_run_v2_service.backend.name}-${data.google_project.project.number}.${var.region}.run.app"

  # Default Firebase Hosting site (site_id = project_id): https://{project_id}.web.app and .firebaseapp.com
  firebase_hosting_primary_url = "https://${local.gcp_project_id}.web.app"

  api_cors_origins = join(",", [
    "https://${local.gcp_project_id}.web.app",
    "https://${local.gcp_project_id}.firebaseapp.com",
  ])

  artifact_registry_url = "${var.region}-docker.pkg.dev/${local.gcp_project_id}/${var.repository_name}"
}
