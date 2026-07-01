# Docker Buildx Bake: API and worker-aggregation images for Cloud Run.
# REGISTRY and TAG must be set by the workflow (docker/bake-action env).
#
# Usage:
#   REGISTRY=us-central1-docker.pkg.dev/entitysystem-development/entitysystem-repo \
#   TAG=abc123 \
#   docker buildx bake -f docker-bake.hcl --push

variable "REGISTRY" {
  default = ""
}

variable "TAG" {
  default = ""
}

group "default" {
  targets = ["api", "worker-aggregation", "worker-service"]
}

target "api" {
  dockerfile = "apps/api/Dockerfile"
  context    = "."
  tags       = ["${REGISTRY}/api:${TAG}", "${REGISTRY}/api:latest"]
  cache-from = ["type=gha,scope=api-v3"]
  cache-to   = ["type=gha,scope=api-v3,mode=max"]
}

target "worker-aggregation" {
  dockerfile = "apps/worker-aggregation/Dockerfile"
  context    = "."
  tags       = ["${REGISTRY}/worker-aggregation:${TAG}", "${REGISTRY}/worker-aggregation:latest"]
  cache-from = ["type=gha,scope=worker-aggregation-v2"]
  cache-to   = ["type=gha,scope=worker-aggregation-v2,mode=max"]
}

target "worker-service" {
  dockerfile = "apps/worker-service/Dockerfile"
  context    = "."
  tags       = ["${REGISTRY}/worker-service:${TAG}", "${REGISTRY}/worker-service:latest"]
  cache-from = ["type=gha,scope=worker-service-v3"]
  cache-to   = ["type=gha,scope=worker-service-v3,mode=max"]
}
