locals {
  app_name = "es"

  # Rates demo owner (Firebase Auth uid) — acting user for /tasks/schedule-tick.
  # Must be a tenant admin (or equivalent) in each tenant where scheduled hooks run.
  demo_scheduled_hook_user_uid = "bq8nxIpwrFhrmM1KjaVfdBzqTyC3"

  # Canonical GCP project per Terraform workspace (project-per-environment).
  # Optional: set -var='project_id=...' to override for local testing only.
  env_base = {
    default = {
      env_suffix               = "dev"
      project_id               = "entitysystem-development"
      node_env                 = "production"
      ensure_firestore_indexes = "true"
      # Inline aggregation on the API — avoids an always-on Cloud Run worker for single-user dev.
      enable_aggregation_pubsub   = false
      enable_ai_worker            = true
      enable_observability_traces = true
      scheduled_hook_user_uid     = local.demo_scheduled_hook_user_uid
      # Allow ?force=true / body force for one-shot cascades (non-prod only).
      schedule_tick_allow_force = true
    }
    dev = {
      env_suffix               = "dev"
      project_id               = "entitysystem-development"
      node_env                 = "production"
      ensure_firestore_indexes = "true"
      # Inline aggregation on the API — avoids an always-on Cloud Run worker for single-user dev.
      enable_aggregation_pubsub   = false
      enable_ai_worker            = true
      enable_observability_traces = true
      scheduled_hook_user_uid     = local.demo_scheduled_hook_user_uid
      schedule_tick_allow_force   = true
    }
    staging = {
      env_suffix                  = "stg"
      project_id                  = "entitysystem-staging"
      node_env                    = "production"
      ensure_firestore_indexes    = "true"
      enable_aggregation_pubsub   = true
      enable_ai_worker            = true
      enable_observability_traces = false
      scheduled_hook_user_uid     = local.demo_scheduled_hook_user_uid
      schedule_tick_allow_force   = true
    }
    prod = {
      env_suffix                  = "prod"
      project_id                  = "entitysystem-production"
      node_env                    = "production"
      ensure_firestore_indexes    = "true"
      enable_aggregation_pubsub   = true
      enable_ai_worker            = true
      enable_observability_traces = false
      scheduled_hook_user_uid     = local.demo_scheduled_hook_user_uid
      schedule_tick_allow_force   = false
    }
  }

  workspace = contains(keys(local.env_base), terraform.workspace) ? terraform.workspace : "default"

  environment_config = merge(
    local.env_base[local.workspace],
    var.project_id != "" ? { project_id = var.project_id } : {},
  )

  gcp_project_id = local.environment_config.project_id
  prefix         = local.environment_config.env_suffix
}
