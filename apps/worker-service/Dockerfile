# Runtime uses the Cloud Run service account (Workload Identity); no .env file in the image.

# ===== BUILDER =====
FROM node:22-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune --scope=worker-service --docker

# ===== INSTALLER =====
FROM node:22-slim AS installer

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY --from=builder /app/out/json/ ./
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/turbo.json ./turbo.json

RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ ./

RUN pnpm exec turbo run build --filter=worker-service...

# ===== PROD-DEPS =====
FROM node:22-slim AS prod-deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY --from=builder /app/out/json/ ./
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile --prod

# ===== RUNNER =====
FROM node:22-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser

# Production workspace structure (node_modules + symlinks, no devDeps)
COPY --from=prod-deps --chown=appuser:appgroup /app .

# Overlay compiled artifacts
COPY --from=installer --chown=appuser:appgroup /app/apps/worker-service/dist ./apps/worker-service/dist
COPY --from=installer --chown=appuser:appgroup /app/apps/worker-service/package.json ./apps/worker-service/package.json
COPY --from=installer --chown=appuser:appgroup /app/packages/worker-firestore/dist ./packages/worker-firestore/dist
COPY --from=installer --chown=appuser:appgroup /app/packages/worker-firestore/package.json ./packages/worker-firestore/package.json
COPY --from=installer --chown=appuser:appgroup /app/packages/ai-engine/dist ./packages/ai-engine/dist
COPY --from=installer --chown=appuser:appgroup /app/packages/ai-engine/package.json ./packages/ai-engine/package.json

# Node production resolves compiled workspace packages from dist/, not src/*.ts
RUN node -e " \
  const fs = require('node:fs'); \
  const patch = (file, subs) => { \
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8')); \
    for (const [subpath, target] of Object.entries(subs)) pkg.exports[subpath] = target; \
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2)); \
  }; \
  patch('packages/ai-engine/package.json', { \
    './permissions': './dist/permissions.js', \
    './schemas': './dist/schemas/index.js', \
    './task-routes': './dist/task-routes.js', \
  }); \
  patch('packages/worker-firestore/package.json', { \
    '.': { types: './dist/index.d.ts', default: './dist/index.js' }, \
  }); \
"

USER appuser
WORKDIR /app/apps/worker-service

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
