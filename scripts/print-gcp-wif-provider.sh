#!/usr/bin/env bash
# Prints the exact GCP_WORKLOAD_IDENTITY_PROVIDER value for GitHub secrets.
# Must use project NUMBER (digits), not project ID — auth@v2 fails with invalid_target otherwise.
#
# Usage:
#   bash scripts/print-gcp-wif-provider.sh PROJECT_ID [POOL_ID] [PROVIDER_ID]
#
# Example:
#   bash scripts/print-gcp-wif-provider.sh entitysystem-development
set -euo pipefail

PROJECT_ID="${1:?PROJECT_ID required (e.g. entitysystem-development)}"
POOL_ID="${2:-github-pool}"
PROVIDER_ID="${3:-github-provider}"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

PROVIDER_NAME="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --format='value(name)' 2>/dev/null || true)"

if [[ -z "$PROVIDER_NAME" ]]; then
  echo "ERROR: Provider '${PROVIDER_ID}' not found in pool '${POOL_ID}' for project ${PROJECT_ID}." >&2
  echo "Run: bash scripts/setup-github-wif.sh ${PROJECT_ID%%-*}" >&2
  exit 1
fi

echo "# GitHub secret GCP_WORKLOAD_IDENTITY_PROVIDER (project ${PROJECT_ID})"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER=${PROVIDER_NAME}"
echo ""
echo "# GitHub secret GCP_SERVICE_ACCOUNT"
echo "GCP_SERVICE_ACCOUNT=github-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
echo ""
echo "Project number: ${PROJECT_NUMBER} (provider path must start with projects/${PROJECT_NUMBER}/...)"
