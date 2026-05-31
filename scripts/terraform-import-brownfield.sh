#!/usr/bin/env bash
# Idempotent imports for resources that may already exist before first Terraform apply
# (Firebase Console bootstrap, CI Artifact Registry ensure script).
#
# Usage (from packages/infrastructure/terraform after init + workspace select):
#   bash ../../../scripts/terraform-import-brownfield.sh <project_id> <region> <repository_id>
#
# Example:
#   bash ../../../scripts/terraform-import-brownfield.sh entitysystem-development us-central1 entitysystem-repo
set -euo pipefail

PROJECT="${1:?project id}"
REGION="${2:?region e.g. us-central1}"
REPO_ID="${3:?artifact registry repository id}"

log() {
  echo "[terraform-import-brownfield] $*" >&2
}

import_if_absent() {
  local address="$1"
  local import_id="$2"

  if terraform state show "$address" &>/dev/null; then
    log "Already in state: ${address}"
    return 0
  fi

  log "Importing ${address} (${import_id})"
  terraform import "$address" "$import_id"
}

# --- Artifact Registry (created by ensure-artifact-registry-repo.sh in CI) ---
if gcloud artifacts repositories describe "$REPO_ID" \
  --location="$REGION" \
  --project="$PROJECT" &>/dev/null; then
  import_if_absent \
    "google_artifact_registry_repository.app_repo" \
    "projects/${PROJECT}/locations/${REGION}/repositories/${REPO_ID}"
else
  log "Skipping Artifact Registry import (repository not found in GCP)"
fi

# --- Firestore default database (often created in Firebase Console) ---
if gcloud firestore databases describe --database="(default)" --project="$PROJECT" &>/dev/null; then
  import_if_absent \
    "google_firestore_database.database" \
    "projects/${PROJECT}/databases/(default)"
else
  log "Skipping Firestore database import (default database not found in GCP)"
fi

# --- Firestore rules release (may exist when database was provisioned) ---
try_import_optional() {
  local address="$1"
  local import_id="$2"

  if terraform state show "$address" &>/dev/null; then
    log "Already in state: ${address}"
    return 0
  fi

  if terraform import "$address" "$import_id" &>/dev/null; then
    log "Imported ${address}"
  else
    log "Optional import skipped: ${address}"
  fi
}

if gcloud firestore databases describe --database="(default)" --project="$PROJECT" &>/dev/null; then
  try_import_optional \
    "google_firebaserules_release.primary" \
    "projects/${PROJECT}/releases/cloud.firestore"
fi

log "Brownfield import pass complete"
