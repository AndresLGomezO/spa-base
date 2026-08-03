# AI Platform Documentation

Complete reference for the #5a AI stack: grounded chat, user memory, record summaries / RAG, cost guards, and how to add new product features (transaction insights, benchmarks, financial advice, rate comparisons, etc.) **without breaking** existing contracts.

Local E2E smoke steps for the current tenant seed live in `.local/ToDos List/AI-platform-testing-guide.md` (not checked in).

---

## Start here

| If you need… | Read |
|---|---|
| Mental model of the whole stack | [01-architecture.md](./01-architecture.md) |
| How chat answers are built (L0–L2, tools, Vertex cache) | [02-grounded-chat.md](./02-grounded-chat.md) |
| Tenant/role spend caps and attribution | [03-cost-guards.md](./03-cost-guards.md) |
| Sections, memory refresh, record summaries, vectors | [04-context-memory-rag.md](./04-context-memory-rag.md) |
| HTTP routes, workers, UI surfaces, env, Terraform | [05-api-worker-ui.md](./05-api-worker-ui.md) |
| **How to ship the next feature safely** | [06-integrating-new-features.md](./06-integrating-new-features.md) |
| Statement / document AI extraction (DLP + KMS + review) | [07-document-extraction.md](./07-document-extraction.md) |

---

## One-page system map

```text
Web (chat / AI Context / spend banner / summary refresh)
        │  HTTP + RBAC
        ▼
API ── assert spend ── create ai_jobs ── Cloud Tasks (or localDispatch)
        │                                    │
        │ CRUD: sections, templates,        ▼
        │ summaries, spend-status     Worker Service
        │                                    │
        │                         createWorkerAiController
        │                         (assertSpend → run model → recordSpend)
        │                                    │
        │              ┌─────────────────────┼─────────────────────┐
        │              ▼                     ▼                     ▼
        │       Grounded chat          Memory refresh       Record narrative
        │       orchestrator           (L2 sections)        + embeddings
        │              │                     │                     │
        ▼              ▼                     ▼                     ▼
Firestore Firestore: ai_jobs, ai_spend*, user_ai_memories,
                   tenant_ai_contexts, __ai_context_sections,
                   ai_record_summaries, ai_chat_sessions
                   + Vertex Matching Engine (vector neighbors)
```

**Packages (SSOT):**

| Package | Responsibility |
|---|---|
| `@repo/ai-engine` | Controller (`runAiRequest`), grounded chat, spend ledger logic, model router, job schemas, task route constants |
| `@repo/ai-context` | Storage schemas + services for tenant/user AI context, sections, record summaries/templates; UI-builder fragment generation |
| `@repo/ai-retrieval` | Vector index client + `VectorIndexService` (upsert / search / access filter) |
| `@repo/firestore-converters` | Repository contracts + in-memory adapters |
| `@repo/gcp-firebase` | Firestore Admin implementations under `tenants/{tenantId}/…` |
| `@repo/hooks` | Data-hook AI actions (`callAi`, `upsertAiRecordContext`, …) |
| `@repo/rbac` / `@repo/shared-types` | Permissions; `tenant.aiLimits` / role `aiSpendLimits` |

---

## Non-negotiable invariants

1. **All Vertex / embedding / image model calls go through `createAiController` → `runAiRequest`.** Do not import `packages/ai-engine/src/clients/internal/**` from apps or other packages.
2. **Spend is checked before the model runs and recorded only after success.** Ledger write failures must not fail a completed job.
3. **`requestedBy: "system"` (or empty) attributes spend to the tenant only.** Real user UIDs attribute tenant + user meters.
4. **AI narratives and RAG live in `ai_record_summaries`, not on business entity fields.** Reserved `aiSummary*` keys are aliases / template helpers only.
5. **Memory and narrative writes are hash-gated.** Unchanged content must not rewrite docs or burn tokens.
6. **API enqueue paths that create AI jobs must call the spend guard** (same limits the worker will re-check).

Details and rationale: [01-architecture.md § Invariants](./01-architecture.md#invariants).

---

## Future product features (where they plug in)

Examples you listed (transaction insights, cross-product relations, financial advice, local banking vs personal situation, real-time rate benchmarks) should **compose** existing layers rather than invent parallel stacks:

| Capability | Prefer |
|---|---|
| Persist structured insight / context | `upsertAiRecordContext` → `ai_record_summaries` (or a new typed collection following the same repo pattern) |
| Compact RAG text + embedding | Template / hook `ragText` + `VectorIndexService` |
| LLM prose (advice, comparison narrative) | `enqueueAiRecordNarrative` or a new `AiFeature` job via `runAiRequest` |
| Chat can answer about it | New grounded-chat **tool** and/or section **block** feeding L2 memory |
| Cost control | Same spend ledger via controller; optionally new permission + UI disable via spend-status |
| External rates / bank APIs | Worker-side data port (not Vertex client); cache in Firestore; tools read cache |

Full recipes: [06-integrating-new-features.md](./06-integrating-new-features.md).
