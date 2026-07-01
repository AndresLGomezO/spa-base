#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<'EOF'
Remove all local Docker resources (machine-wide, not just this repo).

Stops and removes every container, then prunes images, volumes, networks,
build cache, and Buildx build history.

Usage:
  pnpm docker:prune
  bash scripts/docker-prune-all.sh
  bash scripts/docker-prune-all.sh --help
EOF
}

# Run a command with a timeout; kills the process if it hangs.
run_with_timeout() {
  local seconds="$1"
  shift

  "$@" &
  local pid=$!
  local waited=0

  while kill -0 "$pid" 2>/dev/null; do
    if (( waited >= seconds )); then
      echo "Timed out after ${seconds}s: $*" >&2
      kill -9 "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      return 124
    fi
    sleep 1
    (( waited += 1 ))
  done

  wait "$pid"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  print_help
  exit 0
fi

echo "Checking Docker daemon..."
if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed or not on PATH." >&2
  exit 1
fi

if ! run_with_timeout 15 docker version >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Docker is not responding.

Restart Docker Desktop, wait until it shows "Running", then run:
  pnpm docker:prune
EOF
  exit 1
fi

echo "Pruning all local Docker resources..."
echo ""

containers="$(run_with_timeout 15 docker ps -aq 2>/dev/null || true)"
if [[ -n "${containers:-}" ]]; then
  echo "→ Removing containers (force)..."
  # rm -f skips graceful stop and avoids hanging on stuck containers.
  run_with_timeout 120 docker rm -f $containers
else
  echo "→ No containers to remove."
fi

echo "→ Pruning images, volumes, and networks..."
run_with_timeout 300 docker system prune -a --volumes -f

echo "→ Pruning build cache..."
run_with_timeout 120 docker builder prune -a -f

if run_with_timeout 15 docker buildx inspect desktop-linux >/dev/null 2>&1; then
  echo "→ Pruning buildx cache (desktop-linux)..."
  run_with_timeout 120 docker buildx prune -a -f --builder desktop-linux || true
  echo "→ Removing buildx history (desktop-linux)..."
  run_with_timeout 120 docker buildx history rm --all --builder desktop-linux || true
fi

echo "→ Removing buildx history (default context)..."
run_with_timeout 120 docker --context=default buildx history rm --all || true

echo ""
echo "Done."
