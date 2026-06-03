#!/usr/bin/env sh
# Refresh workspace deps when compose bind-mounts overwrite node_modules (same as web dev).
set -e
(cd /app && pnpm install --frozen-lockfile)
node /app/scripts/wait-for-tcp.mjs \
  firebase-emulator:9099 \
  firebase-emulator:8080 \
  firebase-emulator:8085
exec "$@"
