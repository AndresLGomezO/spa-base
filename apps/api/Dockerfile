# TODO: GCP service account / workload identity for prod Firestore (no emulators)
# TODO: Secret Manager for env instead of .env file
# TODO: When workspace packages emit dist/, switch CMD to node dist/index.js

# ===== BUILDER =====
FROM node:22-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune --scope=api --docker

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

RUN pnpm exec turbo run build --filter=api

# ===== RUNNER =====
FROM node:22-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser

# Interim: workspace packages export TypeScript sources; tsx runs API until dist builds exist.
COPY --from=installer --chown=appuser:appgroup /app .

USER appuser
WORKDIR /app/apps/api

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
