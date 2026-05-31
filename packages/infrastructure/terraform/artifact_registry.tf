resource "google_artifact_registry_repository" "app_repo" {
  location      = var.region
  repository_id = var.repository_name
  description   = "Docker images for Entity System (API)"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry_api]
}
