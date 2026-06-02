# Runtime uses the Cloud Run service account (Workload Identity); no .env file in the image.

# ===== BUILDER =====
FROM node:22-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune --scope=worker-aggregation --docker

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

RUN pnpm exec turbo run build --filter=worker-aggregation

RUN pnpm --filter=worker-aggregation deploy --prod --legacy /app/worker-deploy

# ===== RUNNER =====
FROM node:22-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser

COPY --from=installer --chown=appuser:appgroup /app/worker-deploy ./

USER appuser

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
