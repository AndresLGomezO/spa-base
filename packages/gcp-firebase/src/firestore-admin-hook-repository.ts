import {
  createDataHookInputSchema,
  DATA_HOOKS_COLLECTION,
  dataHookDefinitionSchema,
  patchDataHookInputSchema,
  type CreateDataHookInput,
  type DataHookDefinition,
  type PatchDataHookInput,
} from "@repo/hooks";
import { nanoid } from "nanoid";

import type { DataHookRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): DataHookDefinition {
  return dataHookDefinitionSchema.parse(data);
}

export function createFirestoreAdminDataHookRepository(
  config: FirebaseAdminConfig,
): DataHookRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      DATA_HOOKS_COLLECTION,
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
    async create(tenantId, input: CreateDataHookInput) {
      const parsed = createDataHookInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `hook_${nanoid(12)}`;
      const record = dataHookDefinitionSchema.parse({
        id,
        tenantId,
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        entity: parsed.entity,
        phase: parsed.phase ?? "after",
        trigger: parsed.trigger,
        condition: parsed.condition ?? null,
        actions: parsed.actions,
        enabled: parsed.enabled ?? true,
        order: parsed.order ?? 0,
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchDataHookInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Data hook not found: ${id}`);
      }

      patchDataHookInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = dataHookDefinitionSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description ?? undefined }
          : {}),
        ...(input.phase ? { phase: input.phase } : {}),
        ...(input.trigger ? { trigger: input.trigger } : {}),
        ...(input.condition !== undefined
          ? { condition: input.condition ?? null }
          : {}),
        ...(input.actions ? { actions: input.actions } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async delete(tenantId, id) {
      await collection(tenantId).doc(id).delete();
    },
  };
}
