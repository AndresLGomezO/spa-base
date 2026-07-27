resource "google_artifact_registry_repository" "app_repo" {
  location      = var.region
  repository_id = var.repository_name
  description   = "Docker images for Entity System (API)"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"

    most_recent_versions {
      keep_count = 5
    }
  }

  cleanup_policies {
    id     = "delete-untagged-older-than-30d"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "2592000s" # 30 days
    }
  }

  depends_on = [google_project_service.artifactregistry_api]
}
