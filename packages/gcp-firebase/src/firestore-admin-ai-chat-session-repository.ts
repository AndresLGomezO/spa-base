import {
  AI_CHAT_SESSIONS_COLLECTION,
  aiChatSessionRecordSchema,
  type AiChatSessionCreateInput,
  type AiChatSessionListByUserOptions,
  type AiChatSessionRecord,
} from "@repo/ai-context/storage";

import type { AiChatSessionRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function newSessionId(): string {
  return `aisess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createFirestoreAdminAiChatSessionRepository(
  config: FirebaseAdminConfig,
): AiChatSessionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      AI_CHAT_SESSIONS_COLLECTION,
    );
  }

  return {
    async get(tenantId, sessionId) {
      const snapshot = await collection(tenantId).doc(sessionId).get();
      if (!snapshot.exists) {
        return null;
      }
      return aiChatSessionRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async listByUser(
      tenantId,
      userId,
      options?: AiChatSessionListByUserOptions,
    ) {
      const exclude = new Set(options?.excludeStatuses ?? []);
      const snapshot = await collection(tenantId)
        .where("userId", "==", userId)
        .orderBy("updatedAt", "desc")
        .get();
      return snapshot.docs
        .map((doc) =>
          aiChatSessionRecordSchema.parse({
            id: doc.id,
            ...doc.data(),
          }),
        )
        .filter((session) => !exclude.has(session.status));
    },
    async create(tenantId, input: AiChatSessionCreateInput) {
      const now = new Date().toISOString();
      const id = newSessionId();
      const record = aiChatSessionRecordSchema.parse({
        id,
        tenantId,
        userId: input.userId,
        status: input.status ?? "active",
        messages: input.messages ? [...input.messages] : [],
        scratchpad: "",
        citations: [],
        createdAt: now,
        updatedAt: now,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, sessionId, patch) {
      const existing = await this.get(tenantId, sessionId);
      if (!existing) {
        throw new Error(`AI chat session not found: ${sessionId}`);
      }
      const updated = aiChatSessionRecordSchema.parse({
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      await collection(tenantId).doc(sessionId).set(updated);
      return updated;
    },
  };
}

export type { AiChatSessionRecord };
