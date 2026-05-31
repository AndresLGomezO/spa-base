#!/usr/bin/env bash
# Provisions GitHub Actions Workload Identity Federation for development,
# staging, and production GCP projects derived from a shared name prefix.
# Idempotent: safe to re-run if a step was partially completed.
#
# Usage:
#   setup-github-wif.sh PROJECT_PREFIX [options]
#
# Arguments:
#   PROJECT_PREFIX    First part of each GCP project id (e.g. entitysystem
#                     → entitysystem-development, entitysystem-staging,
#                       entitysystem-production)
#
# Options:
#   --repo ORG/REPO   GitHub repository (default: AndresLGomezO/spa-base)
#
# Requires: gcloud CLI, credentials with IAM admin on each project.
#
# Example:
#   bash scripts/setup-github-wif.sh entitysystem
#   bash scripts/setup-github-wif.sh entitysystem --repo AndresLGomezO/spa-base
#
# See docs/infrastructure/github-wif-setup.md for manual steps and troubleshooting.
set -euo pipefail

DEPLOYER_SA="github-deployer"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"
REPO="AndresLGomezO/spa-base"
ENV_SUFFIXES=(development staging production)

PROJECT_PREFIX=""
declare -a PROJECT_IDS=()

usage() {
  sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:?--repo requires ORG/REPO}"
      shift 2
      ;;
    -h | --help)
      usage 0
      ;;
    --*)
      echo "Unknown option: $1" >&2
      usage 1
      ;;
    *)
      if [[ -n "$PROJECT_PREFIX" ]]; then
        echo "Unexpected argument: $1 (only one PROJECT_PREFIX is allowed)" >&2
        usage 1
      fi
      PROJECT_PREFIX="$1"
      shift
      ;;
  esac
done

if [[ -z "$PROJECT_PREFIX" ]]; then
  echo "PROJECT_PREFIX is required." >&2
  usage 1
fi

for suffix in "${ENV_SUFFIXES[@]}"; do
  PROJECT_IDS+=("${PROJECT_PREFIX}-${suffix}")
done

DEPLOYER_ROLES=(
  roles/run.admin
  roles/artifactregistry.admin
  roles/iam.serviceAccountUser
  roles/storage.admin
  roles/firebase.admin
  roles/datastore.owner
  roles/serviceusage.serviceUsageAdmin
  roles/resourcemanager.projectIamAdmin
  roles/secretmanager.admin
)

github_secret_names() {
  local project_id="$1"
  case "$project_id" in
    *-production)
      echo "GCP_WORKLOAD_IDENTITY_PROVIDER_PROD GCP_SERVICE_ACCOUNT_PROD production"
      ;;
    *-development)
      echo "GCP_WORKLOAD_IDENTITY_PROVIDER GCP_SERVICE_ACCOUNT development"
      ;;
    *-staging)
      echo "GCP_WORKLOAD_IDENTITY_PROVIDER GCP_SERVICE_ACCOUNT staging"
      ;;
    *)
      echo "Unknown environment suffix in project id: ${project_id}" >&2
      return 1
      ;;
  esac
}

log() {
  echo "[setup-github-wif] $*" >&2
}

ensure_service_account() {
  local project_id="$1"
  local deployer_email="${DEPLOYER_SA}@${project_id}.iam.gserviceaccount.com"

  if gcloud iam service-accounts describe "$deployer_email" --project="$project_id" &>/dev/null; then
    log "Service account already exists: ${deployer_email}"
  else
    log "Creating service account: ${deployer_email}"
    gcloud iam service-accounts create "$DEPLOYER_SA" \
      --project="$project_id" \
      --display-name="GitHub Actions deployer"
  fi

  echo "$deployer_email"
}

grant_deployer_roles() {
  local project_id="$1"
  local deployer_email="$2"

  log "Ensuring deployer roles on ${project_id}"
  for role in "${DEPLOYER_ROLES[@]}"; do
    gcloud projects add-iam-policy-binding "$project_id" \
      --member="serviceAccount:${deployer_email}" \
      --role="$role" \
      --condition=None \
      --quiet >/dev/null
  done
}

ensure_wif_pool() {
  local project_id="$1"

  if gcloud iam workload-identity-pools describe "$POOL_ID" \
    --project="$project_id" \
    --location=global &>/dev/null; then
    log "WIF pool already exists: ${POOL_ID}"
  else
    log "Creating WIF pool: ${POOL_ID}"
    gcloud iam workload-identity-pools create "$POOL_ID" \
      --project="$project_id" \
      --location=global \
      --display-name="GitHub Actions"
  fi
}

ensure_wif_provider() {
  local project_id="$1"

  if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
    --project="$project_id" \
    --location=global \
    --workload-identity-pool="$POOL_ID" &>/dev/null; then
    log "WIF provider already exists: ${PROVIDER_ID}"
  else
    log "Creating WIF provider: ${PROVIDER_ID} (repo=${REPO})"
    gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
      --project="$project_id" \
      --location=global \
      --workload-identity-pool="$POOL_ID" \
      --display-name="GitHub provider" \
      --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
      --issuer-uri="https://token.actions.githubusercontent.com" \
      --attribute-condition="assertion.repository=='${REPO}'"
  fi
}

bind_workload_identity_user() {
  local project_id="$1"
  local deployer_email="$2"
  local project_number="$3"
  local member="principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPO}"

  log "Ensuring workloadIdentityUser binding for ${deployer_email}"
  gcloud iam service-accounts add-iam-policy-binding "$deployer_email" \
    --project="$project_id" \
    --role="roles/iam.workloadIdentityUser" \
    --member="$member" \
    --quiet >/dev/null
}

provider_resource_name() {
  local project_id="$1"
  local attempt=1
  local provider_name=""

  while [[ $attempt -le 6 ]]; do
    if provider_name="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
      --project="$project_id" \
      --location=global \
      --workload-identity-pool="$POOL_ID" \
      --format='value(name)' 2>/dev/null)"; then
      echo "$provider_name"
      return 0
    fi
    log "Waiting for WIF provider to become readable (attempt ${attempt}/6)..."
    sleep 5
    attempt=$((attempt + 1))
  done

  echo "Failed to read WIF provider ${PROVIDER_ID} in ${project_id}" >&2
  return 1
}

setup_project() {
  local project_id="$1"
  local deployer_email project_number provider_name
  read -r provider_secret_name sa_secret_name gh_environment <<<"$(github_secret_names "$project_id")"

  echo
  echo "=== ${project_id} ==="
  gcloud config set project "$project_id" >/dev/null

  deployer_email="$(ensure_service_account "$project_id")"
  grant_deployer_roles "$project_id" "$deployer_email"
  ensure_wif_pool "$project_id"
  ensure_wif_provider "$project_id"

  project_number="$(gcloud projects describe "$project_id" --format='value(projectNumber)')"
  bind_workload_identity_user "$project_id" "$deployer_email" "$project_number"

  provider_name="$(provider_resource_name "$project_id")"

  RESULTS+=("${project_id}|${gh_environment}|${provider_secret_name}|${provider_name}|${sa_secret_name}|${deployer_email}")
}

declare -a RESULTS=()

log "GitHub repo: ${REPO}"
log "Project prefix: ${PROJECT_PREFIX}"
log "Projects: ${PROJECT_IDS[*]}"

for project_id in "${PROJECT_IDS[@]}"; do
  setup_project "$project_id"
done

echo
echo "=== GitHub secrets (copy into each GitHub Environment) ==="
for row in "${RESULTS[@]}"; do
  IFS='|' read -r project_id gh_environment provider_secret_name provider_name sa_secret_name deployer_email <<<"$row"
  echo
  echo "# ${project_id} → GitHub Environment: ${gh_environment}"
  echo "${provider_secret_name}=${provider_name}"
  echo "${sa_secret_name}=${deployer_email}"
done
echo
