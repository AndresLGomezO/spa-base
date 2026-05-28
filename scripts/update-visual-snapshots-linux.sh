#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="mcr.microsoft.com/playwright:v1.60.0-jammy"

echo "Updating visual snapshots using Linux Playwright image (matches GitHub CI)..."

docker run --rm \
  -v "$ROOT:/work" \
  -w /work \
  "$IMAGE" \
  bash -lc '
    set -euo pipefail
    corepack enable
    CI=1 pnpm install --frozen-lockfile
    CI=1 pnpm --filter @repo/ui build-storybook
    cd packages/ui
    CI=1 pnpm exec playwright test --update-snapshots
  '

echo "Done. Commit the updated PNGs under packages/ui/tests/visual/stories.visual.spec.ts-snapshots/"
