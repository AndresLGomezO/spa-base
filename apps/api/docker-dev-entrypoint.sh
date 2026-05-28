#!/usr/bin/env sh
# Refresh workspace deps when compose bind-mounts overwrite node_modules (same as web dev).
set -e
(cd /app && pnpm install --frozen-lockfile)
exec "$@"
