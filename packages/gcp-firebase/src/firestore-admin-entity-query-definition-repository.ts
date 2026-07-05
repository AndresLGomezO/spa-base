import {
  createEntityQueryDefinitionInputSchema,
  ENTITY_QUERY_DEFINITIONS_COLLECTION,
  entityQueryDefinitionRecordSchema,
  patchEntityQueryDefinitionInputSchema,
  type CreateEntityQueryDefinitionInput,
  type EntityQueryDefinitionRecord,
  type PatchEntityQueryDefinitionInput,
} from "@repo/entity-queries";
import { nanoid } from "nanoid";

import type { EntityQueryDefinitionRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function slugQueryId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function toRecord(data: unknown): EntityQueryDefinitionRecord {
  return entityQueryDefinitionRecordSchema.parse(data);
}

export function createFirestoreAdminEntityQueryDefinitionRepository(
  config: FirebaseAdminConfig,
): EntityQueryDefinitionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      ENTITY_QUERY_DEFINITIONS_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
    async listActive(tenantId) {
      const snapshot = await collection(tenantId)
        .where("status", "==", "ACTIVE")
        .get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async create(tenantId, input: CreateEntityQueryDefinitionInput) {
      const parsed = createEntityQueryDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `entity_query_${nanoid(12)}`;
      const record = entityQueryDefinitionRecordSchema.parse({
        id,
        tenantId,
        queryId: slugQueryId(parsed.name) || id,
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        sourceEntity: parsed.sourceEntity,
        parameters: parsed.parameters,
        filter: parsed.filter,
        sort: parsed.sort,
        ...(parsed.select ? { select: parsed.select } : {}),
        limitMode: parsed.limitMode,
        ...(parsed.limitMode === "topN" ? { limit: parsed.limit } : {}),
        status: parsed.status,
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchEntityQueryDefinitionInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Entity query definition not found: ${id}`);
      }

      patchEntityQueryDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const limitMode = input.limitMode ?? current.limitMode;
      const limit =
        limitMode === "topN" ? (input.limit ?? current.limit ?? 20) : undefined;

      const next = entityQueryDefinitionRecordSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.parameters !== undefined
          ? { parameters: input.parameters }
          : {}),
        ...(input.filter ? { filter: input.filter } : {}),
        ...(input.sort ? { sort: input.sort } : {}),
        ...(input.select !== undefined ? { select: input.select } : {}),
        ...(input.limitMode ? { limitMode: input.limitMode } : {}),
        ...(limitMode === "topN" ? { limit } : {}),
        ...(input.status ? { status: input.status } : {}),
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
