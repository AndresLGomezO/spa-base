locals {
  app_name = "es"

  # Canonical GCP project per Terraform workspace (project-per-environment).
  # Optional: set -var='project_id=...' to override for local testing only.
  env_base = {
    default = {
      env_suffix = "dev"
      project_id = "entitysystem-development"
      node_env   = "production"
    }
    dev = {
      env_suffix = "dev"
      project_id = "entitysystem-development"
      node_env   = "production"
    }
    staging = {
      env_suffix = "stg"
      project_id = "entitysystem-staging"
      node_env   = "production"
    }
    prod = {
      env_suffix = "prod"
      project_id = "entitysystem-production"
      node_env   = "production"
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
