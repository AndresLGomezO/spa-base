import {
  AI_CONTEXT_SECTIONS_COLLECTION,
  aiContextSectionRecordSchema,
  createAiContextSectionInputSchema,
  patchAiContextSectionInputSchema,
  type AiContextSectionRecord,
  type CreateAiContextSectionInput,
  type PatchAiContextSectionInput,
} from "@repo/ai-context/storage";
import { nanoid } from "nanoid";

import type { AiContextSectionRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): AiContextSectionRecord {
  return aiContextSectionRecordSchema.parse(data);
}

export function createFirestoreAdminAiContextSectionRepository(
  config: FirebaseAdminConfig,
): AiContextSectionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      AI_CONTEXT_SECTIONS_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs
        .map((doc) => toRecord({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    },
    async listEnabled(tenantId) {
      const snapshot = await collection(tenantId)
        .where("enabled", "==", true)
        .get();
      return snapshot.docs
        .map((doc) => toRecord({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async create(tenantId, input: CreateAiContextSectionInput) {
      const parsed = createAiContextSectionInputSchema.parse(input);
      const now = new Date().toISOString();
      const existing = await this.list(tenantId);
      const nextOrder =
        parsed.order ??
        (existing.length === 0
          ? 0
          : Math.max(...existing.map((item) => item.order)) + 1);
      const id = `aics_${nanoid(12)}`;
      const record = aiContextSectionRecordSchema.parse({
        id,
        tenantId,
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        order: nextOrder,
        enabled: parsed.enabled ?? true,
        scope: parsed.scope ?? "perUser",
        visibility: parsed.visibility ?? {},
        blocks: parsed.blocks ?? [],
        createdAt: now,
        updatedAt: now,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchAiContextSectionInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`AI context section not found: ${id}`);
      }
      patchAiContextSectionInputSchema.parse(input);
      const next = aiContextSectionRecordSchema.parse({
        ...current,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? input.description === null
            ? { description: undefined }
            : { description: input.description }
          : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.scope !== undefined ? { scope: input.scope } : {}),
        ...(input.visibility !== undefined
          ? { visibility: input.visibility }
          : {}),
        ...(input.blocks !== undefined ? { blocks: input.blocks } : {}),
        updatedAt: new Date().toISOString(),
      });
      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async delete(tenantId, id) {
      await collection(tenantId).doc(id).delete();
    },
    async replaceAll(tenantId, items) {
      const existing = await this.list(tenantId);
      const batch = getFirestoreAdmin(config).batch();
      for (const item of existing) {
        batch.delete(collection(tenantId).doc(item.id));
      }
      const saved: AiContextSectionRecord[] = [];
      for (const item of items) {
        const parsed = aiContextSectionRecordSchema.parse({
          ...item,
          tenantId,
        });
        batch.set(collection(tenantId).doc(parsed.id), parsed);
        saved.push(parsed);
      }
      await batch.commit();
      return saved.sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name),
      );
    },
  };
}

export type { AiContextSectionRecord };
