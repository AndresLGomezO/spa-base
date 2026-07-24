import {
  pushTokenRecordSchema,
  upsertPushTokenInputSchema,
  type PushTokenRecord,
} from "@repo/user-notifications";
import { createHash } from "node:crypto";

import type { PushTokenRepository } from "./repository-contract.js";

export function pushTokenDocumentId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createInMemoryPushTokenRepository(): PushTokenRepository & {
  readonly store: Map<string, PushTokenRecord>;
} {
  const store = new Map<string, PushTokenRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async upsert(tenantId, input) {
      const parsed = upsertPushTokenInputSchema.parse(input);
      const id = pushTokenDocumentId(parsed.token);
      const existing = store.get(key(tenantId, id));
      const now = new Date().toISOString();
      const record = pushTokenRecordSchema.parse({
        id,
        tenantId,
        userId: parsed.userId,
        token: parsed.token,
        ...(parsed.userAgent ? { userAgent: parsed.userAgent } : {}),
        createdAt: existing?.createdAt ?? parsed.createdAt ?? now,
        updatedAt: parsed.updatedAt ?? now,
      });
      store.set(key(tenantId, id), record);
      return record;
    },
    async deleteByToken(tenantId, userId, token) {
      const id = pushTokenDocumentId(token);
      const record = store.get(key(tenantId, id));
      if (!record || record.userId !== userId) {
        return false;
      }
      store.delete(key(tenantId, id));
      return true;
    },
    async listForUser(tenantId, userId) {
      return [...store.values()]
        .filter(
          (record) => record.tenantId === tenantId && record.userId === userId,
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
  };
}
