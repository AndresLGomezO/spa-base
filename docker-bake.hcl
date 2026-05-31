# Docker Buildx Bake: API image for Cloud Run.
# REGISTRY and TAG must be set by the workflow (docker/bake-action env).
#
# Usage:
#   REGISTRY=us-central1-docker.pkg.dev/entitysystem-development/entitysystem-repo \
#   TAG=abc123 \
#   docker buildx bake -f docker-bake.hcl api --push

variable "REGISTRY" {
  default = ""
}

variable "TAG" {
  default = ""
}

group "default" {
  targets = ["api"]
}

target "api" {
  dockerfile = "apps/api/Dockerfile"
  context    = "."
  tags       = ["${REGISTRY}/api:${TAG}", "${REGISTRY}/api:latest"]
  cache-from = ["type=gha,scope=api"]
  cache-to   = ["type=gha,scope=api,mode=max"]
}
