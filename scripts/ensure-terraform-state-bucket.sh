#!/usr/bin/env bash
# Creates the GCS bucket for Terraform remote state if it does not exist.
# Usage: ensure-terraform-state-bucket.sh <bucket_name> <gcp_project_id> <location>
# Requires: gcloud (Cloud SDK). Uses gcloud storage (not gsutil) so WIF/ADC from
# google-github-actions/auth works in CI.
set -euo pipefail

BUCKET="${1:?bucket name}"
PROJECT="${2:?gcp project id}"
LOCATION="${3:?location e.g. us-central1}"
URI="gs://${BUCKET}"

if gcloud storage buckets describe "${URI}" --project="${PROJECT}" &>/dev/null; then
  echo "[ensure-terraform-state-bucket] Bucket already exists: ${URI}"
  exit 0
fi

echo "[ensure-terraform-state-bucket] Creating ${URI} (project=${PROJECT}, location=${LOCATION})"
gcloud storage buckets create "${URI}" --project="${PROJECT}" --location="${LOCATION}"
gcloud storage buckets update "${URI}" --versioning
echo "[ensure-terraform-state-bucket] Versioning enabled on ${URI}"
