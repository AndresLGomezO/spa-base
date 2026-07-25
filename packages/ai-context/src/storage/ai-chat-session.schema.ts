import { z } from "zod";

export const AI_CHAT_SESSIONS_COLLECTION = "ai_chat_sessions";

export const aiChatCitationSchema = z.object({
  kind: z.enum(["entity", "metric", "query", "memory"]),
  entityName: z.string().trim().min(1).optional(),
  recordId: z.string().trim().min(1).optional(),
  metricId: z.string().trim().min(1).optional(),
  queryId: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).max(500),
});

export type AiChatCitation = z.infer<typeof aiChatCitationSchema>;

export const aiChatSessionMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(16_000),
  createdAt: z.string().trim().min(1),
  jobId: z.string().trim().min(1).optional(),
  citations: z.array(aiChatCitationSchema).max(50).optional(),
});

export type AiChatSessionMessage = z.infer<typeof aiChatSessionMessageSchema>;

export const aiChatSessionStatusSchema = z.enum([
  "active",
  "completed",
  "abandoned",
]);

export type AiChatSessionStatus = z.infer<typeof aiChatSessionStatusSchema>;

export const aiChatSessionRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  status: aiChatSessionStatusSchema,
  messages: z.array(aiChatSessionMessageSchema).max(100).default([]),
  scratchpad: z.string().max(32_000).default(""),
  citations: z.array(aiChatCitationSchema).max(50).default([]),
  lastJobId: z.string().trim().min(1).optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type AiChatSessionRecord = z.infer<typeof aiChatSessionRecordSchema>;

export interface AiChatSessionCreateInput {
  readonly userId: string;
  readonly status?: AiChatSessionStatus;
  readonly messages?: readonly AiChatSessionMessage[];
}

export interface AiChatSessionRepository {
  get(tenantId: string, sessionId: string): Promise<AiChatSessionRecord | null>;
  create(
    tenantId: string,
    input: AiChatSessionCreateInput,
  ): Promise<AiChatSessionRecord>;
  update(
    tenantId: string,
    sessionId: string,
    patch: Partial<
      Pick<
        AiChatSessionRecord,
        "status" | "messages" | "scratchpad" | "citations" | "lastJobId"
      >
    >,
  ): Promise<AiChatSessionRecord>;
}
