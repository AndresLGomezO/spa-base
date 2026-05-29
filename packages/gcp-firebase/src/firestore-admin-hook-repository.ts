import {
  createHookInputSchema,
  HOOKS_COLLECTION,
  hookRecordSchema,
  patchHookInputSchema,
  type CreateHookInput,
  type HookRecord,
  type PatchHookInput,
} from "@repo/hooks";
import { nanoid } from "nanoid";

import type { HookRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): HookRecord {
  return hookRecordSchema.parse(data);
}

export function createFirestoreAdminHookRepository(
  config: FirebaseAdminConfig,
): HookRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      HOOKS_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs
        .map((doc) => toRecord({ id: doc.id, ...doc.data() }))
        .sort((left, right) => left.order - right.order);
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async create(tenantId, input: CreateHookInput) {
      const parsed = createHookInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `hook_${nanoid(12)}`;
      const record = hookRecordSchema.parse({
        id,
        tenantId,
        name: parsed.name,
        entity: parsed.entity,
        event: parsed.event,
        type: "action",
        config: parsed.config,
        enabled: parsed.enabled ?? true,
        order: parsed.order ?? 0,
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchHookInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Hook not found: ${id}`);
      }

      patchHookInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = hookRecordSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.config ? { config: input.config } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(next);
      return next;
    },
  };
}
