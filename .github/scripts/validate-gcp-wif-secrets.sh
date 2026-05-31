#!/usr/bin/env bash
# Validates GitHub WIF secrets before google-github-actions/auth (catches invalid_target early).
#
# Usage:
#   validate-gcp-wif-secrets.sh PROVIDER SA EXPECTED_PROJECT_ID
set -euo pipefail

PROVIDER="${1:?workload identity provider resource name}"
SA="${2:?service account email}"
EXPECTED_PROJECT_ID="${3:?expected GCP project id}"

EXPECTED_SA="github-deployer@${EXPECTED_PROJECT_ID}.iam.gserviceaccount.com"

# Full resource name — project NUMBER required (see google-github-actions/auth troubleshooting).
if [[ ! "$PROVIDER" =~ ^projects/[0-9]+/locations/global/workloadIdentityPools/[^/]+/providers/[^/]+$ ]]; then
  echo "::error::GCP_WORKLOAD_IDENTITY_PROVIDER has invalid format."
  echo "Expected: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER"
  echo "Got: ${PROVIDER}"
  echo ""
  echo "Common mistake: using project ID (${EXPECTED_PROJECT_ID}) instead of project number."
  echo "Fix locally: bash scripts/print-gcp-wif-provider.sh ${EXPECTED_PROJECT_ID}"
  exit 1
fi

# Detect project id embedded in path (letters/hyphens after projects/).
if [[ "$PROVIDER" =~ ^projects/[a-z] ]]; then
  echo "::error::GCP_WORKLOAD_IDENTITY_PROVIDER uses a project ID in the path; use the numeric project number."
  echo "Fix: bash scripts/print-gcp-wif-provider.sh ${EXPECTED_PROJECT_ID}"
  exit 1
fi

if [[ "$SA" != "$EXPECTED_SA" ]]; then
  echo "::warning::GCP_SERVICE_ACCOUNT is '${SA}'; expected '${EXPECTED_SA}' for workspace project ${EXPECTED_PROJECT_ID}."
  echo "WIF provider and service account must belong to the same GCP project as Terraform state."
fi

echo "WIF provider format OK for project ${EXPECTED_PROJECT_ID}"
