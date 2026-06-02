#!/usr/bin/env sh
# Refresh workspace deps when compose bind-mounts overwrite node_modules.
set -e
(cd /app && pnpm install --frozen-lockfile)
exec "$@"
