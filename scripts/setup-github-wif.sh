#!/usr/bin/env bash
# Provisions GitHub Actions Workload Identity Federation for development,
# staging, and production GCP projects derived from a shared name prefix.
# Idempotent: safe to re-run; updates provider attribute rules if the pool already exists.
#
# Usage:
#   setup-github-wif.sh PROJECT_PREFIX [options]
#
# Options:
#   --repo ORG/REPO   GitHub repository (default: AndresLGomezO/spa-base)
#
# Example:
#   bash scripts/setup-github-wif.sh entitysystem --repo AndresLGomezO/spa-base
#
# See docs/infrastructure/github-wif-setup.md
set -euo pipefail

DEPLOYER_SA="github-deployer"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"
REPO="AndresLGomezO/spa-base"
ARTIFACT_REPO_ID="entitysystem-repo"
GCP_REGION="us-central1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_SUFFIXES=(development staging production)

WIF_ATTRIBUTE_MAPPING="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository"

PROJECT_PREFIX=""
declare -a PROJECT_IDS=()

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
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
        echo "Unexpected argument: $1" >&2
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

if [[ "$REPO" != */* ]]; then
  echo "REPO must be ORG/REPO (e.g. AndresLGomezO/spa-base), got: ${REPO}" >&2
  exit 1
fi

# GitHub OIDC: assertion.repository is "owner/repo" (not repo name alone). See GitHub OIDC claims.
WIF_ATTRIBUTE_CONDITION="assertion.repository=='${REPO}'"

for suffix in "${ENV_SUFFIXES[@]}"; do
  PROJECT_IDS+=("${PROJECT_PREFIX}-${suffix}")
done

# APIs CI uses before the first successful terraform apply (keep in sync with terraform/main.tf).
BOOTSTRAP_APIS=(
  serviceusage.googleapis.com
  cloudresourcemanager.googleapis.com
  storage.googleapis.com
  run.googleapis.com
  firestore.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  sts.googleapis.com
  artifactregistry.googleapis.com
  secretmanager.googleapis.com
  identitytoolkit.googleapis.com
  firebaserules.googleapis.com
  firebasehosting.googleapis.com
  firebase.googleapis.com
  pubsub.googleapis.com
  cloudtasks.googleapis.com
  cloudscheduler.googleapis.com
  aiplatform.googleapis.com
  cloudkms.googleapis.com
)

DEPLOYER_ROLES=(
  roles/run.admin
  roles/artifactregistry.admin
  roles/iam.serviceAccountAdmin
  roles/iam.serviceAccountUser
  roles/storage.admin
  roles/firebase.admin
  roles/datastore.owner
  roles/serviceusage.serviceUsageAdmin
  roles/resourcemanager.projectIamAdmin
  roles/secretmanager.admin
  roles/pubsub.admin
  roles/cloudtasks.admin
  roles/cloudscheduler.admin
  roles/cloudkms.admin
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

enable_bootstrap_apis() {
  local project_id="$1"
  log "Enabling project APIs (CI + Terraform MVP) on ${project_id}"
  gcloud services enable "${BOOTSTRAP_APIS[@]}" --project="$project_id" --quiet
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
    log "Updating WIF provider ${PROVIDER_ID} (repo=${REPO})"
    gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_ID" \
      --project="$project_id" \
      --location=global \
      --workload-identity-pool="$POOL_ID" \
      --attribute-mapping="$WIF_ATTRIBUTE_MAPPING" \
      --attribute-condition="$WIF_ATTRIBUTE_CONDITION"
  else
    log "Creating WIF provider ${PROVIDER_ID} (repo=${REPO})"
    gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
      --project="$project_id" \
      --location=global \
      --workload-identity-pool="$POOL_ID" \
      --display-name="GitHub provider" \
      --attribute-mapping="$WIF_ATTRIBUTE_MAPPING" \
      --issuer-uri="https://token.actions.githubusercontent.com" \
      --attribute-condition="$WIF_ATTRIBUTE_CONDITION"
  fi
}

bind_workload_identity_user() {
  local project_id="$1"
  local deployer_email="$2"
  local project_number="$3"
  # Path segments: attribute.repository/OWNER/REPO (REPO variable is owner/repo).
  local member="principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPO}"

  log "Ensuring workloadIdentityUser binding for ${deployer_email}"
  log "Principal: ${member}"
  gcloud iam service-accounts add-iam-policy-binding "$deployer_email" \
    --project="$project_id" \
    --role="roles/iam.workloadIdentityUser" \
    --member="$member" \
    --quiet >/dev/null
}

provider_resource_name() {
  local project_id="$1"
  gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
    --project="$project_id" \
    --location=global \
    --workload-identity-pool="$POOL_ID" \
    --format='value(name)'
}

setup_project() {
  local project_id="$1"
  local deployer_email project_number provider_name
  read -r provider_secret_name sa_secret_name gh_environment <<<"$(github_secret_names "$project_id")"

  echo
  echo "=== ${project_id} ==="
  gcloud config set project "$project_id" >/dev/null

  enable_bootstrap_apis "$project_id"
  deployer_email="$(ensure_service_account "$project_id")"
  grant_deployer_roles "$project_id" "$deployer_email"
  bash "${SCRIPT_DIR}/ensure-artifact-registry-repo.sh" "$project_id" "$GCP_REGION" "$ARTIFACT_REPO_ID"
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
