# 01 — AI Platform Architecture

Source of truth for packages, request lifecycle, storage layout, and invariants. Use this before changing any AI code.

Related: [README](./README.md) · [Grounded chat](./02-grounded-chat.md) · [Cost guards](./03-cost-guards.md) · [Context / memory / RAG](./04-context-memory-rag.md) · [Surfaces](./05-api-worker-ui.md) · [Integrating features](./06-integrating-new-features.md)

---

## Goals of the stack

1. **Grounded answers** — chat and narratives cite tenant data under RBAC; inventing facts is forbidden by prompt + tools.
2. **Layered context** — cheap, cacheable prefix (L0–L2) + live tools for precision.
3. **Separate AI documents** — summaries / RAG / narratives are not mixed into business entity schemas.
4. **Unified cost accounting** — every model call goes through one controller so tenant/role caps apply.
5. **Async by default** — HTTP enqueues jobs; workers run long Vertex / embed work.

---

## Package map

```text
apps/web          UI + api-client
apps/api          Auth, RBAC, enqueue, CRUD, spend-status
apps/worker-service
                  Controllers, processors, ports, hooks AI services

packages/ai-engine
  controller/     createAiController, runAiRequest   ← ONLY model entry
  clients/internal/  Vertex / embedding / Imagen     ← restricted imports
  grounded-chat/  Orchestrator, tools, prefix, cache
  spend/          Limits, assert, record, status DTO
  record-ai-summary/  Pure computeRecordAiSummary
  model-router.ts Purpose → model id
  schemas/        ai_jobs, chat input/output
  task-routes.ts  Cloud Tasks path constants
  observability/  Metrics helpers
  pricing/        estimateCostUsd

packages/ai-context
  storage/        Zod schemas + collection names
  services/       Tenant sync, summary upserts, templates
  assembler/…     UI-builder / data-model prompt fragments
  permissions.ts  Section + template permissions

packages/ai-retrieval
  VectorIndexService + Vertex / in-memory clients

packages/firestore-converters  Repository contracts + memory
packages/gcp-firebase          Admin Firestore / GCS adapters
packages/hooks                 callAi / upsertAiRecordContext / …
packages/shared-types          AiSpendLimits on Tenant
packages/rbac                  Role.aiSpendLimits + known permissions
```

### Import rules

| Allowed | Forbidden |
|---|---|
| `@repo/ai-engine` / `@repo/ai-engine/controller` / `…/spend` / `…/grounded-chat` / `…/schemas` | Direct `@repo/ai-engine` → `clients/internal/*` from apps |
| `@repo/ai-context/storage` in **web** (browser-safe) | Bare `@repo/ai-context` in web (pulls Node `fs` via generated loaders) |
| `createAiController` / `runAiRequest` for model I/O | Calling `generateModelAnswer` from processors |

ESLint in `packages/ai-engine/eslint.config.js` enforces the internal-client restriction outside allowlisted files.

---

## End-to-end request lifecycle

### User-facing chat (representative)

```text
1. Web POST /api/ai/chat { question, sessionId? }
2. API authenticate + require ai.chat.run
3. API assertAiSpendAllowedForRequest (tenant + role meters)
4. API create/load ai_chat_sessions; create ai_jobs (pending)
5. API enqueue Cloud Tasks PROCESS_AI_CHAT (or local HTTP dispatch)
6. Worker ai-chat-processor → processAiChat
7. runGroundedChatOrchestrator:
     load tenant entityCatalog + user_ai_memories
     ensure Vertex CachedContent for prefix (or inline contextBlocks)
     planner loop (runAiRequest feature=chat) → tools → synthesis
8. Each runAiRequest:
     assertSpendAllowed → create running job → Vertex → complete + recordSpendUsage
9. Parent chat job completed with answer + citations
10. Web polls GET /api/ai/jobs/:id
```

### Hook-driven record insight path

```text
1. CRUD / schedule fires Data Hook
2. upsertAiRecordContext → ai_record_summaries context + contextHash
3. Optional rag.text / embedding via compute or hook-provided ragText
4. VectorIndexService.upsert datapoint (tenant + access metadata)
5. enqueueAiRecordNarrative when narrative.sourceHash ≠ contextHash
6. Worker recordNarrativeRefresh → runAiRequest(feature=recordNarrativeRefresh)
7. narratives.{variant}.text stored; UI / chat / sections read AI doc
```

---

## Context layers (conceptual)

| Layer | Stored in | Contents | Cacheability |
|---|---|---|---|
| **L0 / L1** | `tenant_ai_contexts` | Entity catalog, theme, entity fragments (incl. summary templates) | Tenant-wide; invalidated on model/UI sync |
| **L2** | `user_ai_memories` | Profile fragment, `dataSnapshot` from AI Context sections, `factIndex`, Vertex cache handles | Per user; hash-gated refresh |
| **Live** | Tools at chat time | Entities, metrics, queries, semantic/keyword search, getRecord | Not cached in prefix |

Prefix assembly: `assembleGroundedChatPrefix` in `@repo/ai-engine/grounded-chat`. Soft caps: `USER_AI_MEMORY_SNAPSHOT_MAX_CHARS` (24k), `GROUNDED_CHAT_PREFIX_MAX_CHARS` (48k).

---

## Job model (`ai_jobs`)

Collection: `tenants/{tenantId}/ai_jobs/{jobId}`

Every **model** invocation creates a job via the controller (child jobs for planner steps, embeddings, narratives, etc.). Parent orchestration jobs (chat, UI builder) are created by API/worker processors and may spawn children with `parentJobId`.

### Features (`AiFeature`)

Defined in `packages/ai-engine/src/permissions.ts`:

| Feature | Run permission | Typical caller |
|---|---|---|
| `chat` | `ai.chat.run` | Grounded chat orchestrator |
| `uiBuilder` | `ai.uiBuilder.run` | UI builder orchestrator |
| `dataModelBuilder` | `ai.dataModelBuilder.run` | Data model AI |
| `dataHookCallAi` / `dataHookBatchCallAi` | `ai.dataHook.run` | Hook `callAi` |
| `dataHookEmbedding` | `ai.dataHook.run` | Embeddings from hooks / summaries |
| `gmailExtract` | `ai.dataHook.run` | Gmail ingest |
| `userAiMemoryRefresh` | `ai.chat.run` | Memory refresh processor |
| `recordNarrativeRefresh` | `ai.dataHook.run` | Narrative processor |

Adding a feature **requires** updating: `AiFeature`, `AI_FEATURE_PERMISSIONS`, `AI_FEATURE_RUN_PERMISSION`, and `aiJobFeatureSchema` in `schemas/ai-job.schema.ts`.

---

## Controller contract

`createAiController(deps)` returns `{ runAiRequest }`.

`AiControllerDeps` (see `ai-request.types.ts`) includes:

- `repository` — `AiJobRepository`
- `clients` — default Vertex / embedding / Imagen (from `default-clients`)
- `vertexAiConfig`
- `flags.isAiEnabled`
- optional `assertSpendAllowed(request)`
- optional `recordSpendUsage(request, usage)`
- optional `now`

### `runAiRequest` sequence

1. If AI disabled → create **failed** job `ai.disabled`, throw `AiDisabledError`
2. `assertSpendAllowed` (throws `AiSpendLimitError` if over)
3. Create **running** job
4. Execute operation (`generateText` | `generateChat` | `generateEmbedding` | image)
5. Attach `modelUsage` via `withEstimatedCost`
6. Mark job **completed** (or **failed** on error)
7. On success only: `recordSpendUsage` (errors swallowed)

**Never** call Vertex outside this path if you want spend + job ledger + disable flag.

Worker factory: `apps/worker-service/src/ai/create-worker-ai-controller.ts`.

---

## Model routing

`resolveModelForPurpose(purpose, env)` in `packages/ai-engine/src/model-router.ts`:

| Purpose | Typical model |
|---|---|
| `planner` | Flash (`VERTEX_MODEL_ID`) |
| `synthesis` / `memoryRefresh` | Pro / reasoning (`VERTEX_REASONING_MODEL_ID`) |
| `embedding` | `text-embedding-005` (or configured) |

Orchestrators pass `modelOptions.modelId` overrides into `runAiRequest` params.

---

## Storage layout

All tenant AI data (except GCS UI renders) uses:

```text
tenants/{tenantId}/{collection}/{docId}
```

| Collection constant | Name | Doc ID |
|---|---|---|
| `AI_JOBS_COLLECTION` | `ai_jobs` | `aijob_…` |
| `AI_SPEND_COLLECTION` | `ai_spend` | `period_YYYY-MM` |
| `AI_SPEND_USERS_COLLECTION` | `ai_spend_users` | `{userId}_YYYY-MM` |
| `TENANT_AI_CONTEXTS_COLLECTION` | `tenant_ai_contexts` | scoped ids (`entityCatalog`, entity, theme, …) |
| `USER_AI_MEMORIES_COLLECTION` | `user_ai_memories` | `{userId}` |
| `AI_CHAT_SESSIONS_COLLECTION` | `ai_chat_sessions` | `aisess_…` |
| `AI_CONTEXT_SECTIONS_COLLECTION` | `__ai_context_sections` | section id |
| `AI_RECORD_SUMMARIES_COLLECTION` | `ai_record_summaries` | `{entityName}__{recordId}` |

Tenant document fields: `aiLimits?: AiSpendLimits`.  
Role catalog entries: `aiSpendLimits?: AiSpendLimits`.

GCS: `tenants/{tenantId}/ai-ui-renders/…` via `ai-render-storage.ts`.

---

## Repository layering

```text
Zod schema (@repo/ai-context or ai-engine)
        ↓
Repository contract (@repo/firestore-converters)
        ↓
In-memory (tests)  |  Firestore Admin (@repo/gcp-firebase)
        ↓
Wired in apps/api/src/server.ts and apps/worker-service/src/index.ts
```

When adding a collection, implement **all three** layers or tests and production diverge.

---

## Async transport

| Piece | Location |
|---|---|
| Path constants | `packages/ai-engine/src/task-routes.ts` → `AI_TASK_ROUTES` |
| API enqueue | `apps/api/src/ai/cloud-tasks.client.ts` |
| Local bypass | `AI_TASKS_LOCAL_DISPATCH=true` → HTTP POST to `WORKER_SERVICE_URL` |
| Queues | Terraform `cloudtasks-ai-jobs.tf` (`ai-jobs`), `cloudtasks-ai-embed.tf` (`ai-embed`) |

Task paths:

- `/tasks/process-ai-chat`
- `/tasks/process-ai-ui-builder`
- `/tasks/refresh-user-ai-memory`
- `/tasks/nightly-user-ai-memory`
- `/tasks/refresh-record-narrative`

---

## Observability

- Job documents: status, `modelUsage`, optional step traces (`AI_STEP_TRACE_ENABLED`)
- `packages/ai-engine/src/observability` — chat / error / step duration metrics helpers
- Debugger UI: `/debugger/ai-jobs` (web)

---

## Invariants

### I1 — Single model gateway

All generative / embedding calls: `runAiRequest`. Tools and data ports must **not** call Vertex. External HTTP (bank rates, FX) belongs in worker data ports / services, then fed into prompts as `contextBlocks` or tool results.

### I2 — Spend gate + post-success ledger

- API: guard before enqueue (fast fail UX).
- Worker controller: guard again (authoritative).
- Record usage only after successful completion.
- Do not throw from ledger writes after success.

### I3 — Attribution

`isAttributableAiUserId(requestedBy)` is false for empty / `"system"`.

| Caller | `requestedBy` | Tenant ledger | User ledger | Role meters |
|---|---|---|---|---|
| Interactive chat / UI builder | Firebase UID | ✓ | ✓ | ✓ |
| Nightly hooks / system jobs | `"system"` | ✓ | ✗ | ✗ |

### I4 — Hash gating

| Surface | Gate |
|---|---|
| User memory | Content hash before upsert; clear Vertex cache names on change |
| Record narrative | Regenerate only if `narratives[v].sourceHash !== contextHash` |
| Section / template mutations | Invalidate tenant user memory caches |

### I5 — AI docs ≠ business docs

Do not add `aiSummaryText` etc. as first-class business fields. Use `ai_record_summaries`. UI field paths: `narratives.default.text`, `rag.text` (legacy aliases still resolve via ports).

### I6 — RBAC on every live read

Grounded-chat tools and section assembly must filter by the **requesting user’s** permissions / field access. Spend status and job read endpoints require the matching `*.read` / `*.run` permissions.

### I7 — Browser-safe imports

Web may import `@repo/ai-context/storage` types/helpers only. Covered by `apps/web/app/lib/browser-safe-ai-context-imports.test.ts`.

---

## Testing expectations

| Layer | Examples |
|---|---|
| Unit | `packages/ai-engine/src/spend/spend.test.ts`, grounded-chat tests, `compute-record-ai-summary.test.ts` |
| API | `apps/api/src/ai/ai.routes.test.ts` (enqueue + spend 403 + spend-status) |
| Worker | Debounced memory refresh tests; hook processor tests with AI services mocked |
| Validate | `pnpm validate:local` before merge |

Mock Vertex locally with `--mock-vertex` (see testing guide). In-memory vector index is **per worker process** — restart clears neighbors until re-upsert.
