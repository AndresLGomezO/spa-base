# 05 — API, Worker, UI, Env & Infrastructure

Operational map of surfaces that host the AI stack.

Related: [Architecture](./01-architecture.md) · [Cost guards](./03-cost-guards.md)

---

## API routes

Registered from `apps/api/src/server.ts`.

### Core AI (`register-ai-routes.ts`)

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/ai/chat` | Spend assert → session → job → `PROCESS_AI_CHAT` |
| `GET` | `/api/ai/chat/sessions/:sessionId` | Owner-scoped |
| `POST` | `/api/ai/ui-builder` | Spend assert → sync contexts → `PROCESS_AI_UI_BUILDER` |
| `GET` | `/api/ai/jobs/:jobId` | Poll status / output / progress / draft |
| `GET` | `/api/ai/jobs` | List (permission-filtered) |
| `GET` | `/api/ai/spend-status` | Caps + soft warn |

### Context sections

`/api/ai-context-sections` (+ `/:id`, `/catalog`) — see [04](./04-context-memory-rag.md).

### Record summary templates

`/api/ai-record-summary-templates` (+ `/:entityName`).

### Record summaries

| Method | Path |
|---|---|
| `GET` | `/api/ai-record-summaries/:entityName/:recordId` |
| `POST` | `/api/ai-record-summaries/:entityName/:recordId/refresh` |

### Error codes to preserve

| Code | HTTP | Meaning |
|---|---|---|
| `ai.spend_limit` | 403 | Over monthly cap |
| `ai.disabled` | (job failed) | Feature flag off |
| Standard CRUD | 401/403/404 | Auth / RBAC / missing session |

---

## Worker tasks

Constants: `packages/ai-engine/src/task-routes.ts`.

| Route | Processor area |
|---|---|
| `/tasks/process-ai-chat` | Grounded chat |
| `/tasks/process-ai-ui-builder` | UI builder orchestrator |
| `/tasks/refresh-user-ai-memory` | L2 refresh for user(s) |
| `/tasks/nightly-user-ai-memory` | Batch memory refresh |
| `/tasks/refresh-record-narrative` | Narrative LLM for AI summary doc |

Registration: `apps/worker-service/src/routes/task.scope.ts`.

### Important worker modules

| Module | Path |
|---|---|
| AI controller factory | `src/ai/create-worker-ai-controller.ts` |
| Chat ports | `src/ai/create-grounded-chat-data-ports.ts` |
| Section ports | `src/ai/create-user-context-section-data-ports.ts` |
| Summary compute + embed | `src/ai/compute-record-ai-summary.ts` |
| Debounced memory | `src/ai/debounced-user-ai-memory-refresh.ts` |
| Env / Vertex / vector | `src/config/env.ts` |
| Hook AI services | `src/hooks/…` |

Dockerfile.dev must `COPY packages/ai-retrieval/package.json` (and other workspace deps) — enforced by `pnpm check:docker-workspace`.

---

## Web UI map

| Surface | Path | Gate |
|---|---|---|
| Chat | `/ai/chat` | `ai.chat.run` |
| AI Context layout | `/settings/ai-context` | section **or** template read |
| Sections | `/settings/ai-context/sections` | `aiContextSection.*` |
| Record summaries | `/settings/ai-context/record-summaries` | `aiRecordSummaryTemplate.*` |
| Legacy redirect | `/settings/user-ai-context` → AI Context | — |
| Form / list AI | designer AI controls | `ai.uiBuilder.*` + spend |
| Entity summary | detail / expandable table | AI doc fields + out-of-sync |
| Tenant limits | platform tenant panel | admin |
| Role limits | Role editor | role update |
| AI jobs debugger | `/debugger/ai-jobs` | debugger perms |

Client helpers: `apps/web/app/lib/api-client.ts` (`submitAiChat`, `getAiSpendStatus`, job getters, section/template/summary APIs).

i18n: `common.json` keys under `userAiContext`, `recordAiSummaryTemplates`, nav `aiContextNav`, spend copy as applicable. Run `pnpm i18n:validate` when adding strings.

---

## Permissions inventory

### Engine (`@repo/ai-engine/permissions`)

- `ai.chat.run` / `ai.chat.read`
- `ai.uiBuilder.run` / `ai.uiBuilder.read`
- `ai.dataModelBuilder.run`
- `ai.dataHook.run` / `ai.dataHook.read`

### Context (`@repo/ai-context/permissions`)

- `aiContextSection.read|create|update|delete`
- `aiRecordSummaryTemplate.read|update|delete`

All are registered via `packages/rbac` `getAllKnownPermissions()` — new permissions must be added to the exporting package **and** appear in known-permissions aggregation.

---

## Environment variables

### API

| Var | Role |
|---|---|
| `WORKER_SERVICE_URL` | Task target |
| `CLOUD_TASKS_QUEUE_NAME` | Default `ai-jobs` |
| `TASKS_SA_EMAIL` | OIDC for Cloud Tasks |
| `AI_TASKS_LOCAL_DISPATCH` | Skip Cloud Tasks; HTTP to worker |
| `GCP_PROJECT_ID` / `GCP_REGION` | Tasks client |

### Worker

| Var | Role |
|---|---|
| `VERTEX_GCP_PROJECT_ID` / `GCP_PROJECT_ID` | Vertex project |
| `VERTEX_LOCATION` | Default `global` |
| `VERTEX_MODEL_ID` | Flash / planner default |
| `VERTEX_REASONING_MODEL_ID` | Pro / narratives / synthesis |
| `VERTEX_IMAGEN_MODEL_ID` | Image generation |
| `USE_REAL_VERTEX` / `IS_LOCAL` | Mock vs real |
| `VERTEX_VECTOR_*` | Matching Engine wiring |
| `AI_EMBED_TASKS_QUEUE_NAME` | Default `ai-embed` |
| `AI_STEP_TRACE_ENABLED` | Persist CoT / step traces |

See also `docs/infrastructure/environment-variables.md`.

---

## Terraform

| File | What |
|---|---|
| `packages/infrastructure/terraform/cloudtasks-ai-jobs.tf` | Main AI jobs queue, IAM, API enablement |
| `packages/infrastructure/terraform/cloudtasks-ai-embed.tf` | Embed queue (higher concurrency) |
| `cloudrun-worker-service.tf` | Worker env (Vertex, embed queue, step trace) |
| `cloudrun.tf` | API `AI_TASKS_LOCAL_DISPATCH` etc. |

After Terraform changes: `pnpm terraform:fmt` and review plan per environment.

---

## Local development tips

```bash
pnpm dev:docker:reset -- --only ai --mock-vertex
# or --use-real-vertex when credentials allow
```

- Prefer mock Vertex for CI-like loops.
- After hook catalog changes, restart worker.
- Vector neighbors vanish on worker restart (in-memory).
- Full smoke: `.local/ToDos List/AI-platform-testing-guide.md`.

---

## Validation gates that touch AI

`pnpm validate:local` includes:

- Package lint (no `clients/internal` leaks; gcp-firebase firestore import rules)
- Bundle size / runtime dep asserts (`esbuild.mjs`, `esbuild-runtime-deps`)
- Docker workspace COPY for new packages (e.g. `ai-retrieval`)
- syncpack catalog (e.g. `google-auth-library`)
- i18n + knip unused exports on web
- `check:ai-context` generated fragment hash
