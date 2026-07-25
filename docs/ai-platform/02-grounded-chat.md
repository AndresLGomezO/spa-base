# 02 — Grounded Chat

How `/ai/chat` produces answers from tenant data: prefix layers, Vertex CachedContent, planner/tool loop, and data ports.

Related: [Architecture](./01-architecture.md) · [Context / memory / RAG](./04-context-memory-rag.md) · [Integrating features](./06-integrating-new-features.md)

---

## Entry points

| Layer | Path |
|---|---|
| Web (page) | `apps/web/app/routes/ai/chat.tsx` → `features/ai-chat/AiChatPage` |
| Web (FAB) | `apps/web/app/features/ai-chat/AiChatFab` (mounted in `private-layout.tsx`) |
| API | `POST /api/ai/chat` → `register-ai-routes.ts` |
| Task | `AI_TASK_ROUTES.PROCESS_AI_CHAT` |
| Worker | `ai-chat-processor.ts` → `process-ai-chat.ts` → `runGroundedChatOrchestrator` |
| Package | `packages/ai-engine/src/grounded-chat/` |

Permissions: `ai.chat.run` (enqueue), `ai.chat.read` (sessions / spend-status with UI builder read).

---

## System instruction (contract with the model)

Defined in `constants.ts` as `GROUNDED_CHAT_SYSTEM_INSTRUCTION`:

- Answer **only** from tools + provided memory/schema context.
- Never invent records, amounts, or dates.
- Cite with `entityName:recordId`, metric ids, or query ids.
- Prefer tool numbers over narrative memory.
- Prefer `semanticSearchRecords` for NL lookup; `keywordSearchRecords` for exact substrings.
- If unknown, say so and ask at most one clarifying question.

Changing this text changes product behavior for **all** tenants — treat as a breaking prompt change.

---

## Prefix assembly (L0–L2)

`assembleGroundedChatPrefix` builds:

- System-facing schema / catalog text (tenant AI contexts)
- User profile + L2 `dataSnapshot` / fact index from `user_ai_memories`
- Stable `prefixHash` for cache invalidation

Caps:

- `USER_AI_MEMORY_SNAPSHOT_MAX_CHARS = 24_000`
- `GROUNDED_CHAT_PREFIX_MAX_CHARS = 48_000`
- Planner loop: `GROUNDED_CHAT_MAX_STEPS = 5`

L2 snapshot text is produced by `resolveAndAssembleUserContextSections` from `__ai_context_sections` blocks (see [04](./04-context-memory-rag.md)).

---

## Vertex CachedContent

| Piece | Role |
|---|---|
| `ensureVertexCacheForUserMemory` | Create/reuse cache when prefix hash + TTL valid |
| `vertex-cached-content.ts` | REST client (`createRest…` / `createMock…`) |
| Memory fields | `vertexCacheName`, `vertexCacheExpireAt`, `prefixHash` |

TTL: `VERTEX_CACHE_TTL_SECONDS = 3600` with `VERTEX_CACHE_REFRESH_SKEW_MS = 5 minutes`.

On L2 / section / catalog content change, refresh clears cache handles so the next chat rebuilds prefix. If cache creation fails, orchestrator falls back to sending prefix as `contextBlocks` (still correct, more tokens).

---

## Orchestrator loop

`runGroundedChatOrchestrator` (simplified):

1. Load session history (optional), tenant catalog, user memory.
2. Assemble prefix → ensure Vertex cache.
3. **Planner** `runAiRequest` (`generateText`, purpose ≈ planner / flash) with tool schema instruction → JSON (`groundedChatPlannerResponseSchema`):
   - `tool_calls` → execute tools → append results → loop
   - `final` → answer (+ citations)
   - `clarify` → clarifying question
4. Optional **synthesis** pass on pro model when needed.
5. Return `AiChatOutput` (answer, citations, confidence, …).
6. Persist session turn.

All model steps use `feature: "chat"`, `permission: "ai.chat.run"`, `requestedBy: userId`, `parentJobId: chatJobId`.

---

## Tools

Enum: `groundedChatToolNameSchema` in `constants.ts`.

| Tool | Purpose |
|---|---|
| `listEntities` | Catalog entities the user can see |
| `listMetrics` / `listQueries` | Discover metrics / saved queries |
| `semanticSearchRecords` | Vector neighbors via `VectorIndexService` |
| `keywordSearchRecords` | Substring / keyword search |
| `getRecord` | Fetch one record (RBAC + field redaction) |
| `getUserMemoryFacts` | Read structured fact index from L2 |
| `runSavedQuery` / `runMetric` | Execute saved analytics under permissions |
| `searchRecords` | **Deprecated** alias |

Implementation: `executeGroundedChatTool` in `tools.ts`.  
Worker wiring: `apps/worker-service/src/ai/create-grounded-chat-data-ports.ts`.

### Data ports (`GroundedChatDataPorts`)

Ports are **pure data accessors** (repos, query engine, vector service, redaction). They must not call Vertex. Enrich search hits with `rag.text` / narratives from `AiRecordSummaryRepository` when present.

Redaction: `redactForPrompt` + field access map (`PiiLevel`: public / masked / excluded) before putting field values into tool results or prefixes.

---

## Citations

Planner may return `citations[]` (`entity` | `metric` | `query` | `memory`).  
`mergeCitations` / `toAiChatCitations` normalize for the API/UI.

New tools that surface facts should populate citations so the UI can deep-link.

**Web UI:** `AiChatCitations` renders entity citations as links to `/app/{entityName}/{recordId}` (camelCase entity name). Metric/query/memory citations show as labeled chips.

---

## Sessions

- Collection `ai_chat_sessions`
- Created on first chat turn if `sessionId` omitted; pass `sessionId` to continue
- Owner-scoped: `userId` must match JWT
- `GET /api/ai/chat/sessions` — list (excludes `abandoned`)
- `GET /api/ai/chat/sessions/:sessionId` — full thread
- `DELETE /api/ai/chat/sessions/:sessionId` — soft-hide (`abandoned`)
- Multi-turn UI: floating FAB popup + `/ai/chat` page share `apps/web/app/features/ai-chat/`

Relation traversal: system instruction tells the planner to follow FK fields (`actorId`, `financialItemId`, `paymentScheduleId`, …) via `getRecord` / multi-step search across business entities.

---

## Extending chat for new domains

| Goal | Mechanism |
|---|---|
| Answer from new entity / insight docs | Ensure RAG upserts + `semanticSearchRecords` / `getRecord` already cover them; or add tool |
| Always inject domain snapshot | New section block kind → L2 (preferred for “who I am / my portfolio”) |
| Call external benchmark API at ask-time | New tool + data port (cache results; do not bypass spend for any LLM rewrite) |
| Stronger reasoning for advice | Keep planner on flash; use synthesis / dedicated feature job on pro |

See [06-integrating-new-features.md](./06-integrating-new-features.md) for checklists.

---

## Failure modes

| Symptom | Likely cause |
|---|---|
| 403 `ai.spend_limit` | Tenant/role monthly cap |
| Empty / shallow answers | Missing sections, empty vector index (worker restart), RBAC filtering all tools |
| Stale memory | Debounced / nightly refresh not run; hash unchanged incorrectly |
| High token use | Cache miss every turn; prefix over cap truncating useful L2 |
