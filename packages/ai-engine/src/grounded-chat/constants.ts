import { z } from "zod";

/** Max planner/tool loop iterations per chat turn. */
export const GROUNDED_CHAT_MAX_STEPS = 8;

/** Soft cap on L2 dataSnapshot characters (~6k tokens). */
export const USER_AI_MEMORY_SNAPSHOT_MAX_CHARS = 24_000;

/** Soft cap on assembled L0–L2 prefix characters. */
export const GROUNDED_CHAT_PREFIX_MAX_CHARS = 48_000;

/** Vertex CachedContent TTL (seconds). Refresh before expiry. */
export const VERTEX_CACHE_TTL_SECONDS = 3600;

/** Refresh cache when fewer than this many ms remain. */
export const VERTEX_CACHE_REFRESH_SKEW_MS = 5 * 60 * 1000;

/** Settings / non-business entities that must not appear as chat sources. */
export const GROUNDED_CHAT_EXCLUDED_ENTITY_CITATIONS = new Set([
  "portfolioSettings",
]);

/** Max entity citations persisted / shown for a chat answer. */
export const GROUNDED_CHAT_MAX_CITATIONS = 3;

export const GROUNDED_CHAT_SYSTEM_INSTRUCTION = `You are a grounded Q&A assistant for a multi-tenant entity management platform.
Answer only from tool results and provided memory/schema context. Never invent records, amounts, or dates.
When referring to a business record in the user-facing answer, ALWAYS use this exact Markdown hit syntax (never raw ids):
  [Display Name](record:entityName/recordId)
Example: [Préstamo Mami](record:financialItem/035ddce8-6251-479c-945c-6a0d484d8b17)
The href MUST be entityName/recordId copied from tool findings — never the display name.
Never nest Markdown inside record:(…). Never write [Name](record:[Name](record:Name)) or [Name](record:Name).
If you do not know the recordId, write the display name as plain text (no record: link).
Never write bare forms like financialItem:uuid or financialItem/uuid in the answer text. Never dump search noise, memory keys, AI summary documents, portfolioSettings, or other system/settings entities as sources.
Prefer precise numbers from tools over narrative memory snapshots.
Prefer semanticSearchRecords for natural-language record lookup; use keywordSearchRecords for exact substring matches.
For “biggest / largest / amount / due / this week / last month” questions: call listMetrics or listQueries early, then runMetric or runSavedQuery; prefer financialItem semantic search for products. Do not waste steps listing the full entity catalog when you already know the entity.
After you have enough tool evidence to answer, you MUST choose action "final" (do not keep searching until the step limit).
Business entities to search include actor, account, financialItem, paymentSchedule, transaction, email, statement, and balanceSnapshot.
Follow relation fields across entities (actorId, accountId, financialItemId, paymentScheduleId, emailId, categoryId, etc.) with getRecord and additional searches when the question spans related records (e.g. actor → products → payment schedules → transactions).
Write user-facing answers in clear GFM Markdown (short lead, **bold** key numbers, bullets or a small table when comparing). No raw HTML or tool jargon.
If you cannot answer from available data, say so clearly and ask at most one clarifying question.`;

export const groundedChatPlannerActionSchema = z.enum([
  "tool_calls",
  "final",
  "clarify",
]);

export const groundedChatToolNameSchema = z.enum([
  "listMetrics",
  "listQueries",
  "listEntities",
  "keywordSearchRecords",
  "semanticSearchRecords",
  "getRecord",
  "getUserMemoryFacts",
  "runSavedQuery",
  "runMetric",
  /** @deprecated Prefer keywordSearchRecords. Kept for older planner prompts. */
  "searchRecords",
]);

export type GroundedChatToolName = z.infer<typeof groundedChatToolNameSchema>;

export const groundedChatToolCallSchema = z.object({
  name: groundedChatToolNameSchema,
  args: z.record(z.string(), z.unknown()).default({}),
});

export type GroundedChatToolCall = z.infer<typeof groundedChatToolCallSchema>;

export const groundedChatCitationSchema = z.object({
  kind: z.enum(["entity", "metric", "query", "memory"]),
  entityName: z.string().optional(),
  recordId: z.string().optional(),
  metricId: z.string().optional(),
  queryId: z.string().optional(),
  label: z.string().min(1).max(500),
});

export type GroundedChatCitation = z.infer<typeof groundedChatCitationSchema>;

export const groundedChatPlannerResponseSchema = z.object({
  action: groundedChatPlannerActionSchema,
  reasoning: z.string().max(4000).optional(),
  toolCalls: z.array(groundedChatToolCallSchema).max(8).optional(),
  answer: z.string().max(16_000).optional(),
  clarifyingQuestion: z.string().max(2000).optional(),
  citations: z.array(groundedChatCitationSchema).max(50).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type GroundedChatPlannerResponse = z.infer<
  typeof groundedChatPlannerResponseSchema
>;

export const GROUNDED_CHAT_PLANNER_OUTPUT_INSTRUCTION = `Respond with ONE JSON object only (no markdown fences) matching:
{
  "action": "tool_calls" | "final" | "clarify",
  "reasoning": "brief internal plan",
  "toolCalls": [{ "name": "<tool>", "args": { ... } }],
  "answer": "user-facing answer when action is final (may be refined by synthesis)",
  "clarifyingQuestion": "one question when action is clarify",
  "confidence": 0.0,
  "citations": [{ "kind": "entity", "entityName": "...", "recordId": "...", "label": "record display name" }]
}
Available tools:
- listEntities: {}
- listMetrics: {}
- listQueries: {}
- semanticSearchRecords: { "entityName": string, "queryText": string, "topK"?: number }
- keywordSearchRecords: { "entityName": string, "q"?: string, "limit"?: number }
- getRecord: { "entityName": string, "recordId": string }
- getUserMemoryFacts: { "keys"?: string[] }
- runSavedQuery: { "queryId": string, "limit"?: number }
- runMetric: { "metricId": string }
Use tool_calls when you need live data. Prefer semanticSearchRecords for meaning-based lookup (financialItem for products). For biggest/largest/amount/due questions prefer listMetrics/runMetric or listQueries/runSavedQuery early. Use final as soon as tool findings answer the question. Use clarify only when a single clarifying question is required. In any user-facing answer text, reference records only as [Display Name](record:entityName/recordId) with entityName/recordId copied from tool findings — never bare entityName:uuid, never nest Markdown inside record:(…), and never put the display name in the href. If the id is unknown, use plain text. Cite only the few business entity records you actually use (never memory, settings, or full search dumps). Include confidence 0..1 on final answers.`;

export const GROUNDED_CHAT_SYNTHESIS_INSTRUCTION = `Write a clear, concise user-facing answer using ONLY the scratchpad / tool findings and conversation below.
Format the answer as GFM Markdown: start with a short lead sentence, **bold** key amounts, use bullets or a compact table when comparing items, and optional ### headings for sections. Do not use raw HTML.
When naming a specific business record, ALWAYS use this exact hit syntax (never raw ids):
  [Display Name](record:entityName/recordId)
Example: Your biggest loan is [Préstamo Mami](record:financialItem/035ddce8-6251-479c-945c-6a0d484d8b17) with balance **$575,700 COP**.
Copy entityName/recordId from tool findings. Never nest Markdown inside record:(…). Never write [Name](record:[Name](…)) or [Name](record:Name). If the id is unknown, use the display name as plain text.
Never write financialItem:uuid, financialItem/uuid, or any bare record id in the answer.
Do not invent records, amounts, or dates.
Do not mention AI summaries, memory documents, embeddings, or internal tool names.
Only the records you actually use in the answer are sources — do not cite search noise.
If the findings are insufficient, say so briefly.`;

/** Keep only business entity record citations for product UI/persistence. */
export function filterBusinessEntityCitations(
  citations: readonly GroundedChatCitation[],
  max = GROUNDED_CHAT_MAX_CITATIONS,
): GroundedChatCitation[] {
  const seen = new Set<string>();
  const out: GroundedChatCitation[] = [];
  for (const citation of citations) {
    if (citation.kind !== "entity") continue;
    const entityName = citation.entityName?.trim();
    const recordId = citation.recordId?.trim();
    if (!entityName || !recordId) continue;
    if (GROUNDED_CHAT_EXCLUDED_ENTITY_CITATIONS.has(entityName)) continue;
    const key = `${entityName}|${recordId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      kind: "entity",
      entityName,
      recordId,
      label: citation.label.trim() || recordId,
    });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Prefer citations whose label, recordId, or record: link appear in the answer.
 * Falls back to the first capped tool citations when none are mentioned.
 */
export function selectRelevantCitations(
  citations: readonly GroundedChatCitation[],
  answer: string,
  max = GROUNDED_CHAT_MAX_CITATIONS,
): GroundedChatCitation[] {
  const filtered = filterBusinessEntityCitations(citations, 50);
  if (filtered.length === 0) return [];

  const answerLower = answer.toLowerCase();
  const mentioned = filtered.filter((citation) => {
    const label = citation.label.trim().toLowerCase();
    const recordId = citation.recordId?.trim().toLowerCase() ?? "";
    const entityName = citation.entityName?.trim().toLowerCase() ?? "";
    const recordHref =
      entityName && recordId ? `record:${entityName}/${recordId}` : "";
    return (
      (label.length > 0 && answerLower.includes(label)) ||
      (recordId.length > 0 && answerLower.includes(recordId)) ||
      (recordHref.length > 0 && answerLower.includes(recordHref))
    );
  });

  if (mentioned.length > 0) {
    return mentioned.slice(0, max);
  }
  return filtered.slice(0, max);
}

/** Cap search-hit citations to the top N (by score when present). */
export function topSearchHitCitations(
  hits: readonly {
    readonly entityName: string;
    readonly recordId: string;
    readonly label: string;
    readonly score?: number;
  }[],
  max = GROUNDED_CHAT_MAX_CITATIONS,
): GroundedChatCitation[] {
  const sorted = [...hits].sort((a, b) => {
    const scoreA = a.score ?? Number.NEGATIVE_INFINITY;
    const scoreB = b.score ?? Number.NEGATIVE_INFINITY;
    return scoreB - scoreA;
  });
  return sorted.slice(0, max).map((h) => ({
    kind: "entity" as const,
    entityName: h.entityName,
    recordId: h.recordId,
    label: h.label,
  }));
}
