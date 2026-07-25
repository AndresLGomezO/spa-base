# 04 — Context, Memory, Record Summaries & RAG

How tenant/user context is authored, refreshed into L2 memory, turned into record-level AI documents, embedded for semantic search, and consumed by chat/UI.

Related: [Architecture](./01-architecture.md) · [Grounded chat](./02-grounded-chat.md) · [Integrating features](./06-integrating-new-features.md)

---

## Two admin surfaces (keep both)

| Tab | Route | Defines |
|---|---|---|
| **Sections** | `/settings/ai-context/sections` | *What* enters each user’s L2 memory (`__ai_context_sections`) |
| **Record summaries** | `/settings/ai-context/record-summaries` | *How* compact RAG text is templated per entity (optional; hooks may supply `ragText` directly) |

Permissions: `aiContextSection.*` and `aiRecordSummaryTemplate.*` (see `@repo/ai-context/permissions`).

Nav item **AI Context** shows if the user has **either** section or template read.

---

## Tenant AI contexts (`tenant_ai_contexts`)

Synced fragments used by UI builder, data-model AI, and grounded-chat catalog:

- Entity catalog overview
- Per-entity fragments (including **record summary templates** under key `aiRecordSummaryTemplate`)
- Theme / other assemblers

Services: `packages/ai-context/src/services/tenant-ai-context.service.ts`  
API sync helper: `apps/api/src/ai/sync-tenant-ai-contexts.ts` (e.g. before UI builder enqueue).

Mutations that change L1 content should invalidate user Vertex caches / schedule memory refresh as appropriate.

---

## User AI context sections

### Schema

`packages/ai-context/src/storage/ai-context-section.schema.ts`  
Collection: `__ai_context_sections`

| Field | Notes |
|---|---|
| `name`, `description`, `order`, `enabled` | Admin metadata |
| `scope` | `tenantWide` \| `perUser` |
| `visibility.requiredPermissions` | Optional gate |
| `blocks[]` | Ordered content builders |

### Block kinds

| Kind | Role |
|---|---|
| `staticMarkdown` | Fixed instructions / policy text |
| `entityField` | Field values from a record |
| `entityRecordsSummary` | Aggregated / listed records |
| `metricValue` | Metric readout |
| `savedQueryTop` | Top rows from a saved query |

Assembly: `assemble-user-context-sections.ts` + worker ports `create-user-context-section-data-ports.ts`.  
UI editor: `UserAiContextBlockEditor.tsx`.

### API

`apps/api/src/ai-context-sections/register-ai-context-section-routes.ts`

- `GET/POST /api/ai-context-sections`
- `GET/PATCH/DELETE /api/ai-context-sections/:id`
- `PUT /api/ai-context-sections/catalog` (bulk replace)

Mutating routes call `invalidateUserAiMemoryCachesForTenant` so L2/Vertex stay coherent.

---

## User AI memory (`user_ai_memories`)

Doc id = `userId`.

| Field | Role |
|---|---|
| `profileFragment` | Short user profile text |
| `dataSnapshot` | Assembled L2 markdown from sections |
| `factIndex` | Structured facts for `getUserMemoryFacts` |
| `contentHash` / related hashes | Gate writes |
| `vertexCacheName` / `vertexCacheExpireAt` / `prefixHash` | CachedContent handle |

### Refresh pipeline

| Path | Mechanism |
|---|---|
| On-demand / debounced | `debounced-user-ai-memory-refresh.ts` (default ~5 min) → `REFRESH_USER_AI_MEMORY` |
| Nightly | `NIGHTLY_USER_AI_MEMORY` |
| Core function | `refreshUserAiMemory` in `grounded-chat/refresh-user-ai-memory.ts` |

Feature on any LLM step during refresh: `userAiMemoryRefresh` / permission `ai.chat.run`. Confirm `requestedBy` in `user-ai-memory-refresh-processor.ts` when attributing spend (per-user refresh should use that user’s UID; tenant-wide nightly batches may use `"system"` depending on wiring).

`invalidateUserAiMemoryCachesForTenant` clears Vertex handles after section/template changes.

---

## Record AI summaries (`ai_record_summaries`)

**Primary home for domain insights** (loans, portfolio, future transaction cards, etc.).

Doc id: `{entityName}__{recordId}` via `buildAiRecordSummaryDocId`.

| Field | Role |
|---|---|
| `context` / `contextHash` | Rich relational JSON snapshot |
| `rag` | `{ text, hash, embedding?, sourceHash, updatedAt, … }` compact embeddable text |
| `narratives` | Map of variant → `{ text, sourceHash, model?, updatedAt }` LLM markdown |
| `ownerId` / `accessUserIds` / `tenantWideRead` | Auth denorm for chat/RAG |

Services:

- `upsertAiRecordContext`
- `upsertAiRecordRag`
- `upsertAiRecordNarrative`

Pure template compute (optional path): `computeRecordAiSummary` in `@repo/ai-engine/record-ai-summary`  
Reserved alias keys: `aiSummaryText`, `aiSummaryJson`, `aiSummaryEmbedding`, `aiSummaryHash` — **not** stored on business entities going forward.

### Templates

Stored as entity fragment `aiRecordSummaryTemplate` on `tenant_ai_contexts`:

- `textTemplate` (mustache `{{field}}`)
- `jsonFields`, `embeddingFields`
- `piiLevel` map (`public` \| `masked` \| `excluded`)

CRUD API: `/api/ai-record-summary-templates`  
UI: `RecordAiSummaryTemplatesView.tsx`

### Hook actions (`@repo/hooks`)

| Action | Effect |
|---|---|
| `upsertAiRecordContext` | Write/merge `context` (+ optional ragText); hash-gated |
| `computeRecordAiSummary` | Run template compute (load result; may feed RAG) |
| `enqueueAiRecordNarrative` | Cloud Task when narrative stale vs `contextHash` |
| `callAi` | General structured LLM call (feature `dataHookCallAi`) |

Worker services wire these in hook execution (`worker-hook-entity-services`, `compute-record-ai-summary.ts`).

### Narrative refresh

- Task: `REFRESH_RECORD_NARRATIVE`
- Processor: `record-narrative-refresh-processor.ts`
- Feature: `recordNarrativeRefresh`
- API on-demand: `POST /api/ai-record-summaries/:entity/:recordId/refresh` (spend-guarded)
- UI: `SummaryOutOfSyncBanner` when `narratives.*.sourceHash !== contextHash`

**Pattern used by current tenant:** mutation hooks update context/RAG with `enqueueNarrative: false`; nightly or user Refresh catches up prose (avoids token spike on every field edit).

### Debug / UI read

`GET /api/ai-record-summaries/:entityName/:recordId`  
Access: owner, `accessUserIds`, `tenantWideRead`, template readers, superadmin.

UI summary tabs resolve `narratives.default.text`, `narratives.loans.text`, `rag.text` (legacy aliases still work via `readAiRecordSummaryField`).

### Backfill

`scripts/ai/backfill-record-summaries.ts` — migrate leftover inline `aiSummary*` into AI docs.

---

## Vector retrieval (`@repo/ai-retrieval`)

| Symbol | Role |
|---|---|
| `VectorIndexService` | upsert / remove / findNeighbors + access filters |
| `VertexVectorIndexClient` | Matching Engine |
| `InMemoryVectorIndex` | Local/dev (per process!) |

Embeddings produced via controller `generateEmbedding` (`dataHookEmbedding` or summary pipeline). Datapoints should carry tenant + ACL metadata so `semanticSearchRecords` cannot leak cross-user hits.

**Local caveat:** in-memory index dies on worker restart until context/RAG re-upserts.

Env (worker): `VERTEX_VECTOR_INDEX_ID`, `VERTEX_VECTOR_INDEX_ENDPOINT_ID`, `VERTEX_VECTOR_DIM`, `VERTEX_VECTOR_REGION`, `VERTEX_VECTOR_DEPLOYED_INDEX_ID`, `VERTEX_VECTOR_PUBLIC_ENDPOINT_DOMAIN`.

Queue for embed fan-out: `AI_EMBED_TASKS_QUEUE_NAME` (Terraform `cloudtasks-ai-embed.tf`).

---

## Recommended pipeline for new “insight” domains

Example: **transaction insights** or **rate vs benchmark**:

```text
Domain hook / scheduled job
  → assemble relational + external snapshot into context (JSON)
  → upsertAiRecordContext (hash-gated)
  → set rag.text (template or hand-built comparison blurb)
  → embed + VectorIndexService.upsert
  → enqueueAiRecordNarrative (variant e.g. "advice" | "benchmark") when prose needed
  → Sections optionally pull narratives.*.text into L2
  → Chat discovers via semanticSearchRecords / getRecord / new tool
```

Do **not** invent a second parallel “insights” store unless you also add converters + Admin repo + access rules + chat ports. Prefer `ai_record_summaries` variants or clearly scoped new collections following the same layering.

---

## PII / field access

- Template `piiLevel` drives `computeRecordAiSummary` redaction.
- Chat tools use `redactForPrompt` with RBAC field access.
- Never put raw secrets into `staticMarkdown` section blocks or unredacted `context` that is widely ACL’d.
