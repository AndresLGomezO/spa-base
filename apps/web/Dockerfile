# ===== BUILDER =====
FROM public.ecr.aws/docker/library/node:22-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .

# Prune to get only web + workspace dependencies
RUN pnpm dlx turbo prune --scope=web --docker

# ===== INSTALLER =====
FROM public.ecr.aws/docker/library/node:22-slim AS installer

# Firebase configuration build arguments (uncomment when Firebase Hosting is wired)
# ARG VITE_FIREBASE_API_KEY
# ARG VITE_FIREBASE_AUTH_DOMAIN
# ARG VITE_FIREBASE_PROJECT_ID
# ARG VITE_FIREBASE_STORAGE_BUCKET
# ARG VITE_FIREBASE_MESSAGING_SENDER_ID
# ARG VITE_FIREBASE_APP_ID

# API URL and optional Google OAuth / App Check (uncomment when backend exists)
# ARG VITE_API_URL
# ARG VITE_GOOGLE_CLIENT_ID
# ARG VITE_APP_CHECK_RECAPTCHA_SITE_KEY
# ARG VITE_ENV
# ARG VITE_FIRESTORE_COLLECTION_PREFIX

# Set as environment variables for Vite build (uncomment with ARGs above)
# ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
# ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
# ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
# ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
# ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
# ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
# ENV VITE_API_URL=$VITE_API_URL
# ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
# ENV VITE_APP_CHECK_RECAPTCHA_SITE_KEY=$VITE_APP_CHECK_RECAPTCHA_SITE_KEY
# ENV VITE_ENV=$VITE_ENV
# ENV VITE_FIRESTORE_COLLECTION_PREFIX=$VITE_FIRESTORE_COLLECTION_PREFIX

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Skip Cypress binary download (~200MB); not used during vite build
ENV CYPRESS_INSTALL_BINARY=0

WORKDIR /app

# Copy pruned files
COPY --from=builder /app/out/json/ ./
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/turbo.json ./turbo.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code using the pruned out folder
COPY --from=builder /app/out/full/ ./

# Build web using Turbo (turbo is in devDeps from lockfile)
WORKDIR /app
RUN pnpm exec turbo run build --filter=web

# ===== PRODUCTION =====
FROM nginx:stable-alpine AS prod

COPY --from=installer /app/apps/web/build/client /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
