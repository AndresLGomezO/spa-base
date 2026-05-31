#!/usr/bin/env bash
# Creates the Docker Artifact Registry repository if it does not exist.
# Usage: ensure-artifact-registry-repo.sh <gcp_project_id> <region> <repository_id>
# Requires: gcloud, artifactregistry.googleapis.com enabled, credentials with artifactregistry.repositories.create
set -euo pipefail

PROJECT="${1:?gcp project id}"
REGION="${2:?region e.g. us-central1}"
REPO_ID="${3:?repository id e.g. entitysystem-repo}"

if gcloud artifacts repositories describe "${REPO_ID}" \
  --location="${REGION}" \
  --project="${PROJECT}" &>/dev/null; then
  echo "[ensure-artifact-registry-repo] Repository already exists: ${REGION}-docker.pkg.dev/${PROJECT}/${REPO_ID}"
  exit 0
fi

echo "[ensure-artifact-registry-repo] Creating ${REPO_ID} (project=${PROJECT}, location=${REGION})"
gcloud artifacts repositories create "${REPO_ID}" \
  --repository-format=docker \
  --location="${REGION}" \
  --project="${PROJECT}" \
  --description="Docker images for Entity System (API)"
