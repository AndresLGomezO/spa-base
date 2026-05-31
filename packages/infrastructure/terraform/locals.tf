locals {
  backend_image = var.api_image

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
    }
  }

  current_config = local.cloud_run_configs[local.environment_tier]

  default_storage_bucket = "${local.gcp_project_id}.appspot.com"

  backend_url_full = "https://${google_cloud_run_v2_service.backend.name}-${data.google_project.project.number}.${var.region}.run.app"

  # Firebase Hosting site IDs are globally unique (max length 30).
  _firebase_dev_site_id_candidate = "es-dev-${local.gcp_project_id}"
  firebase_hosting_dev_site_id    = length(local._firebase_dev_site_id_candidate) <= 30 ? local._firebase_dev_site_id_candidate : substr("esd-${md5(local.gcp_project_id)}", 0, 30)

  firebase_hosting_primary_url = contains(["dev", "default"], local.workspace) ? "https://${local.firebase_hosting_dev_site_id}.web.app" : "https://${local.gcp_project_id}.web.app"

  firebase_hosting_cors_list = contains(["dev", "default"], local.workspace) ? [
    "https://${local.firebase_hosting_dev_site_id}.web.app",
    "https://${local.firebase_hosting_dev_site_id}.firebaseapp.com",
    ] : [
    "https://${local.gcp_project_id}.web.app",
    "https://${local.gcp_project_id}.firebaseapp.com",
  ]

  api_cors_origins = join(",", local.firebase_hosting_cors_list)

  artifact_registry_url = "${var.region}-docker.pkg.dev/${local.gcp_project_id}/${var.repository_name}"
}
