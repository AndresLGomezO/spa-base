import {
  aiChatSessionRecordSchema,
  type AiChatSessionCreateInput,
  type AiChatSessionRecord,
  type AiChatSessionRepository,
} from "./repository-contract.js";

function newId(): string {
  return `aisess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createInMemoryAiChatSessionRepository(): AiChatSessionRepository {
  const store = new Map<string, AiChatSessionRecord>();

  function key(tenantId: string, sessionId: string): string {
    return `${tenantId}::${sessionId}`;
  }

  return {
    async get(tenantId, sessionId) {
      return store.get(key(tenantId, sessionId)) ?? null;
    },
    async create(tenantId, input: AiChatSessionCreateInput) {
      const now = new Date().toISOString();
      const record = aiChatSessionRecordSchema.parse({
        id: newId(),
        tenantId,
        userId: input.userId,
        status: input.status ?? "active",
        messages: input.messages ? [...input.messages] : [],
        scratchpad: "",
        citations: [],
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async update(tenantId, sessionId, patch) {
      const existing = store.get(key(tenantId, sessionId));
      if (!existing) {
        throw new Error(`AI chat session not found: ${sessionId}`);
      }
      const updated = aiChatSessionRecordSchema.parse({
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      store.set(key(tenantId, sessionId), updated);
      return updated;
    },
  };
}
