import { z } from "zod";

/** Max planner/tool loop iterations per chat turn. */
export const GROUNDED_CHAT_MAX_STEPS = 5;

/** Soft cap on L2 dataSnapshot characters (~6k tokens). */
export const USER_AI_MEMORY_SNAPSHOT_MAX_CHARS = 24_000;

/** Soft cap on assembled L0–L2 prefix characters. */
export const GROUNDED_CHAT_PREFIX_MAX_CHARS = 48_000;

/** Vertex CachedContent TTL (seconds). Refresh before expiry. */
export const VERTEX_CACHE_TTL_SECONDS = 3600;

/** Refresh cache when fewer than this many ms remain. */
export const VERTEX_CACHE_REFRESH_SKEW_MS = 5 * 60 * 1000;

export const GROUNDED_CHAT_SYSTEM_INSTRUCTION = `You are a grounded Q&A assistant for a multi-tenant entity management platform.
Answer only from tool results and provided memory/schema context. Never invent records, amounts, or dates.
When facts come from tools, cite them using entityName:recordId, metric ids, or query ids.
If you cannot answer from available data, say so clearly and ask at most one clarifying question.
Prefer precise numbers from tools over narrative memory snapshots.
Prefer semanticSearchRecords for natural-language record lookup; use keywordSearchRecords for exact substring matches.`;

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
  "answer": "user-facing answer when action is final",
  "clarifyingQuestion": "one question when action is clarify",
  "confidence": 0.0,
  "citations": [{ "kind": "entity"|"metric"|"query"|"memory", "entityName?", "recordId?", "metricId?", "queryId?", "label": "..." }]
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
Use tool_calls when you need live data. Prefer semanticSearchRecords for meaning-based lookup. Use final when you can answer. Use clarify only when a single clarifying question is required. Include confidence 0..1 on final answers.`;
