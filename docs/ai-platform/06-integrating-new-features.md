# 06 — Integrating New AI Features (Cookbook)

How to add product capabilities—transaction insights, cross-product relations, financial advice, local-bank vs personal situation, real-time rate benchmarks—**without breaking** grounded chat, spend, memory, or summary contracts.

Related: [Architecture invariants](./01-architecture.md#invariants) · [Chat tools](./02-grounded-chat.md) · [Spend](./03-cost-guards.md) · [Context / RAG](./04-context-memory-rag.md)

---

## Decision tree

```text
What are you adding?
│
├─ Structured facts that must be retrieved later
│     → Prefer ai_record_summaries.context (+ rag + optional narrative)
│
├─ Something chat should “always know” about the user
│     → AI Context section block (L2) and/or factIndex
│
├─ On-demand LLM answer with tools
│     → Extend grounded chat (tool and/or prompt) OR new AiFeature job
│
├─ Background / scheduled LLM prose
│     → Hook enqueueAiRecordNarrative OR new worker task + runAiRequest
│
├─ External market / bank data (no LLM)
│     → Worker data port + Firestore cache; tools/sections read cache
│
└─ Interactive UI that starts AI
      → API enqueue + spend guard + spend-status UI gate
```

**Default bias:** reuse `ai_record_summaries` + hooks + existing chat tools before inventing a new package or collection.

---

## Pattern A — Domain insight document (recommended for “insights”)

**Examples:** transaction insights card, portfolio cross-product rollup, “your rates vs market” snapshot.

### Steps

1. **Define context JSON shape** (versioned keys under `context`, e.g. `context.rates`, `context.benchmark`, `context.relations`).
2. **Author a Data Hook** (or system hook) that:
   - Loads related entities / join data
   - Optionally fetches external benchmark (HTTP in worker service, **not** in the hook expression itself if complex—use a service injected into hook services)
   - Calls `upsertAiRecordContext` with hash-stable payload
   - Sets `ragText` to a compact comparison blurb **or** relies on `computeRecordAiSummary` template
3. **Vector:** ensure embedding upsert runs (summary pipeline or explicit embed job) so `semanticSearchRecords` works.
4. **Narrative (optional):** `enqueueAiRecordNarrative` with a dedicated `variant` (`insights`, `advice`, `benchmark`) when you need markdown for UI tabs.
5. **UI:** summary field path `narratives.insights.text` or dedicated component reading `GET /api/ai-record-summaries/...`.
6. **Chat:** usually no code if RAG + getRecord work; add a tool only if you need specialized queries.
7. **Spend:** narrative/embed go through controller → automatic metering. Use `requestedBy: "system"` for schedules.

### Do not

- Write insight blobs onto the business transaction entity.
- Call Vertex from the hook interpreter.
- Enqueue narrative on every keystroke (follow out-of-sync + nightly/on-demand pattern).

---

## Pattern B — New grounded-chat tool

**Examples:** `compareRateToBenchmark`, `listRelatedProducts`, `getFinancialAdviceContext`.

### Steps

1. Add name to `groundedChatToolNameSchema` in `grounded-chat/constants.ts`.
2. Update `GROUNDED_CHAT_SYSTEM_INSTRUCTION` / planner output instruction so the model knows when to call it (keep “no invention” rules).
3. Implement case in `executeGroundedChatTool` (`tools.ts`).
4. Extend `GroundedChatDataPorts` + `create-grounded-chat-data-ports.ts` with RBAC-safe loaders.
5. Return citations where possible.
6. Add unit tests with mock ports.
7. **No** Vertex inside the tool.

### Spend note

Tools themselves are free; planner/synthesis tokens still meter under `chat`. Heavy tools that trigger nested LLM calls must use `runAiRequest` (child jobs) with the chat `parentJobId`.

---

## Pattern C — New section block kind

**Examples:** “My open loans summary”, “Bank vs me” static+dynamic hybrid.

### Steps

1. Extend `aiContextSectionBlockSchema` (Zod) in `@repo/ai-context/storage`.
2. Assemble markdown in `assemble-user-context-sections.ts`.
3. Extend `UserContextSectionDataPorts` + worker factory.
4. UI: `UserAiContextBlockEditor.tsx` + i18n keys (both `en`/`es`).
5. Rely on existing invalidation → memory refresh.

Respect `USER_AI_MEMORY_SNAPSHOT_MAX_CHARS` — huge dumps belong in RAG/tools, not L2.

---

## Pattern D — New async AI job feature

**Examples:** “Generate weekly financial advice digest”, “Recompute all benchmark narratives”.

### Steps

1. Add to `AiFeature` + permission maps in `permissions.ts`.
2. Add to `aiJobFeatureSchema` / input-output Zod in `schemas/`.
3. Add `AI_TASK_ROUTES` path + worker route + processor.
4. Processor calls **only** `aiController.runAiRequest({ feature, permission, operation, requestedBy, parentJobId?, … })`.
5. API (if user-triggered): authenticate → permission → **spend assert** → create parent job → enqueue.
6. Web: poll jobs; disable when spend blocked.
7. Terraform: usually same `ai-jobs` queue; new queue only if isolation/rate limits demand it.
8. Docs + tests.

### Attribution

| Trigger | `requestedBy` |
|---|---|
| User clicked “Refresh advice” | UID |
| Nightly cron / schedule hook | `"system"` |

---

## Pattern E — External rates / banking APIs

**Examples:** live mortgage index, competitor APY, FX.

### Architecture

```text
Scheduler / webhook
  → worker fetcher service (HTTP)
  → Firestore cache collection (tenant or platform scope)
  → hooks/tools/sections read cache
  → optional LLM narrative compares cache vs user context
```

Rules:

- Fetching market data is **not** an AI feature (no spend).
- Comparing with LLM **is** — use Pattern A/D.
- Cache with TTL; tools should prefer cache over live HTTP at chat time (latency + reliability).
- Never put API keys in prompts or AI docs.

If the cache is a new collection: schema → converter contract → Admin repo → wire server/worker → firestore indexes if queried.

---

## Pattern F — Cross-product relational insights

Reuse existing relational stack:

1. Entity relations / joins already in platform (`docs/relational-data-system-guide.md`).
2. Hook walks parent + children → single `context` object (`relations.products[]`, etc.).
3. Portfolio-level doc (e.g. `portfolioSettings__{id}`) for rollups (already used for loans/incomes variants).
4. Chat: `getRecord` + semantic search on rollup RAG text.

Avoid N+1 LLM calls per child when one rollup narrative suffices.

---

## Pattern G — Financial advice (high risk)

Advice features need stronger grounding:

1. **Facts** in `context` / tools (balances, rates, dates) — never only in free-form memory.
2. **System instruction** addendum: not personalized regulated advice; cite tools; refuse when data missing.
3. Prefer **synthesis** model for final prose; keep planner on flash.
4. Store advice under `narratives.advice` with `sourceHash = contextHash`.
5. UI must show as-of timestamps from `updatedAt` / context.
6. Spend: advice generation is expensive — role caps + soft warn matter.

---

## Checklist: “Did I break the stack?”

Before merge, verify:

- [ ] No new imports of `clients/internal/**` outside allowlisted ai-engine files
- [ ] Every LLM/embed path uses `runAiRequest`
- [ ] User-facing enqueue has API spend assert + UI spend gate
- [ ] Background jobs use `requestedBy: "system"` unless intentionally user-attributed
- [ ] New Firestore collections have converter + Admin + in-memory + `server.ts` / worker wiring
- [ ] New permissions exported and in `known-permissions`
- [ ] Web imports only browser-safe `@repo/ai-context/storage` (if needed)
- [ ] Docker workspace check passes if new package deps were added
- [ ] `google-auth-library` / similar deps use pnpm `catalog:`
- [ ] i18n keys en+es; `pnpm i18n:validate`
- [ ] Unit/API tests for happy path + spend rejection (if HTTP)
- [ ] `pnpm validate:local`
- [ ] Hash-gating: unchanged inputs do not rewrite AI docs / burn tokens
- [ ] RBAC: tools/ports filter by acting user
- [ ] AI content not written onto business entity schemas

---

## Worked sketch: “Real-time rate vs my mortgage”

| Layer | Choice |
|---|---|
| Market rate | Pattern E — worker cron writes `market_rates/es_mortgage_index` (example) |
| Personal side | Existing loan `ai_record_summaries` context.rates |
| Compare snapshot | Hook or small job merges both into `context.benchmark = { market, mine, deltaBps }` |
| RAG | One-line `ragText`: “Hipoteca X 3.1% vs market 2.7% (+40 bps)” |
| Narrative | Variant `benchmark` with chart fences (reuse existing narrative prompt style) |
| Chat tool | Optional `getRateBenchmark({ entityName, recordId })` reading AI doc + cache |
| Spend | Narrative refresh user/on-demand = UID; nightly = system |
| UI | Summary tab + out-of-sync when loan rate changes |

---

## Worked sketch: “Transaction insights”

| Layer | Choice |
|---|---|
| Trigger | `transaction.afterCreate/Update` Data Hook |
| Context | Counterparty, category, related products, rolling 30d stats |
| RAG | Short merchant + amount + anomaly flag |
| Narrative | Nightly batch `enqueueAiRecordNarrative` variant `insights` |
| L2 | Section block `savedQueryTop` or `entityRecordsSummary` for recent anomalies |
| Chat | `semanticSearchRecords` over transaction RAG |

---

## Reference file index (extension hotspots)

| Concern | Primary files |
|---|---|
| Features / permissions | `packages/ai-engine/src/permissions.ts`, `schemas/ai-job.schema.ts` |
| Controller | `packages/ai-engine/src/controller/run-ai-request.ts` |
| Chat tools | `packages/ai-engine/src/grounded-chat/{constants,tools,orchestrator}.ts` |
| Sections | `packages/ai-context/src/storage/ai-context-section.schema.ts`, `assemble-user-context-sections.ts` |
| Summaries | `packages/ai-context/src/services/ai-record-summary*.ts`, `packages/hooks/src/interpret-data-hook.ts` |
| Spend | `packages/ai-engine/src/spend/*`, `apps/api/src/ai/ai-spend-guard.ts` |
| Worker wiring | `apps/worker-service/src/ai/*`, `src/routes/task.scope.ts` |
| API wiring | `apps/api/src/server.ts`, `register-*-routes.ts` |
| Web | `apps/web/app/features/{ai-spend,user-ai-context,record-ai-summary-templates,entity-summary}` |

---

## Out of scope (do not invent here)

- Per-feature monthly sub-budgets (use tenant/role caps)
- Retroactive historical spend reconstruction
- Storing embeddings on business entity documents
- Parallel “AI v2” controller beside `runAiRequest`
