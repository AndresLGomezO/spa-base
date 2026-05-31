#!/usr/bin/env bash
# Creates the GCS bucket for Terraform remote state if it does not exist.
# Usage: ensure-terraform-state-bucket.sh <bucket_name> <gcp_project_id> <location>
# Requires: gsutil (Cloud SDK), credentials with storage.buckets.create on the project.
set -euo pipefail

BUCKET="${1:?bucket name}"
PROJECT="${2:?gcp project id}"
LOCATION="${3:?location e.g. us-central1}"

if gsutil ls -b "gs://${BUCKET}" &>/dev/null; then
  echo "[ensure-terraform-state-bucket] Bucket already exists: gs://${BUCKET}"
  exit 0
fi

echo "[ensure-terraform-state-bucket] Creating gs://${BUCKET} (project=${PROJECT}, location=${LOCATION})"
gsutil mb -p "${PROJECT}" -l "${LOCATION}" "gs://${BUCKET}"
gsutil versioning set on "gs://${BUCKET}"
echo "[ensure-terraform-state-bucket] Versioning enabled on gs://${BUCKET}"
