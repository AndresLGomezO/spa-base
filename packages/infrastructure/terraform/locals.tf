locals {
  backend_image            = var.api_image
  worker_aggregation_image = var.worker_aggregation_image
  worker_service_image     = var.worker_service_image

  enable_aggregation_pubsub = try(
    local.environment_config.enable_aggregation_pubsub,
    var.enable_aggregation_pubsub,
  )

  enable_ai_worker = try(
    local.environment_config.enable_ai_worker,
    var.enable_ai_worker,
  )

  enable_observability_traces = try(
    local.environment_config.enable_observability_traces,
    var.enable_observability_traces,
  )

  # Predictable Cloud Run names (do not reference the resources — env vars on those
  # services need their own URLs and would create Terraform cycles otherwise).
  backend_service_name    = "${local.app_name}-backend-service-${local.prefix}"
  worker_service_name     = "${local.app_name}-worker-service-${local.prefix}"
  backend_url_full        = "https://${local.backend_service_name}-${data.google_project.project.number}.${var.region}.run.app"
  worker_service_url_full = local.enable_ai_worker ? "https://${local.worker_service_name}-${data.google_project.project.number}.${var.region}.run.app" : ""

  environment_tier = contains(["dev", "staging", "default"], local.workspace) ? "development" : (
    local.workspace == "prod" ? "production" : "development"
  )

  # Warm API (min=1) avoids cold-start UX; cpu_idle=true keeps idle CPU off the bill.
  # Workers keep always-on CPU (cpu_idle=false) for Pub/Sub pull / long tasks.
  cloud_run_configs = {
    development = {
      backend_min_instances            = 1
      max_instances                    = 4
      backend_cpu                      = "1000m"
      backend_memory                   = "512Mi"
      cpu_idle                         = true
      startup_cpu_boost                = true
      timeout                          = "60s"
      max_instance_request_concurrency = 20
      worker_min_instances             = 1
      worker_max_instances             = 2
      # cpu_idle=false requires limits.cpu >= 1 and memory >= 512Mi on Cloud Run v2.
      worker_cpu      = "1000m"
      worker_memory   = "1Gi"
      worker_cpu_idle = false
      worker_timeout  = "3600s"
    }
    production = {
      backend_min_instances            = 1
      max_instances                    = 8
      backend_cpu                      = "1000m"
      backend_memory                   = "1Gi"
      cpu_idle                         = true
      startup_cpu_boost                = true
      timeout                          = "60s"
      max_instance_request_concurrency = 40
      worker_min_instances             = 1
      worker_max_instances             = 2
      worker_cpu                       = "1000m"
      worker_memory                    = "1Gi"
      worker_cpu_idle                  = false
      worker_timeout                   = "3600s"
    }
  }

  current_config = local.cloud_run_configs[local.environment_tier]

  default_storage_bucket = "${local.gcp_project_id}.appspot.com"

  # Default Firebase Hosting site (site_id = project_id): https://{project_id}.web.app and .firebaseapp.com
  firebase_hosting_primary_url = "https://${local.gcp_project_id}.web.app"

  api_cors_origins = join(",", [
    "https://${local.gcp_project_id}.web.app",
    "https://${local.gcp_project_id}.firebaseapp.com",
  ])

  artifact_registry_url = "${var.region}-docker.pkg.dev/${local.gcp_project_id}/${var.repository_name}"
}
