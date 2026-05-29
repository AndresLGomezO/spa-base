# Performance & Scaling Guide (Phase A)

Phase A hardens the platform for production load using in-process optimizations and frontend discipline. Distributed infrastructure (Redis, queues, Prometheus) is deferred to Phase B.

## Backend

### In-process TTL caches

| Cache | Location | TTL | Invalidation |
|-------|----------|-----|--------------|
| Role catalog | `apps/api/src/rbac/role-catalog.ts` | `CACHE_TTL_MS` (default 60s) | Role CRUD |
| User access profile | `apps/api/src/rbac/user-access-cache.ts` | `CACHE_TTL_MS` | Admin user role PATCH |
| Tenant entity definitions | `apps/api/src/entities/entity-runtime-context.ts` | `CACHE_TTL_MS` | Definition sync/reload |

Shared utility: `@repo/shared-types` `createTtlCache`.

Environment variables (API):

- `CACHE_TTL_MS` — default `60000`
- `STRICT_QUERY_PAGINATION` — default `true` in test, `false` otherwise
- `API_RATE_LIMIT_MAX` — default `100` (`0` disables)
- `API_RATE_LIMIT_TIME_WINDOW_MS` — default `60000`
- `ENABLE_PERF_LOGS` — default `true` outside production

### Query engine

- Cursor pagination with default limit 20, max 100
- Strict pagination mode rejects unbounded list requests (no explicit limit or query pagination)
- Firestore missing-index errors log structured hints (collection, filters, sort, suggested fields)

### API middleware

- `@fastify/compress` — gzip/deflate for JSON responses
- `@fastify/rate-limit` — per-IP baseline (tenant/user keying requires auth hook ordering; Phase B improvement)
- Structured request timing logs: `rbacMs`, `queryMs`, `hooksMs`, `totalMs`

## Frontend

### TanStack Query

Provider in `apps/web/app/routes/private-layout.tsx`.

| Query key | Data | staleTime |
|-----------|------|-----------|
| `["entities"]` | Entity catalog | 5 min |
| `["entity", name, queryConfig]` | Paginated lists | 30s default |
| `["entity", name, "record", id]` | Single record | 30s default |

Mutations invalidate list queries automatically.

### Entity table

- `@tanstack/react-virtual` virtualizes rendered rows (max viewport ~480px)
- Filter inputs debounced 300ms before querying

### Lazy routes

Entity list, new, and edit routes are separate route modules (`entity-list.tsx`, `entity-new.tsx`, `entity-edit.tsx`). React Router 7 framework mode automatically code-splits each route file into its own browser chunk — no manual `lazy()` wiring is required in `routes.ts`.

## Out of scope (Phase B)

- Redis / distributed cache
- Async hook queues (BullMQ)
- Prometheus / Grafana
- Load-test harness
- CDN configuration

## Verification

```bash
pnpm --filter @repo/shared-types test
pnpm --filter @repo/query-engine test
pnpm --filter api test
pnpm --filter web test
```
