import {
  createEntityCategoryInputSchema,
  ENTITY_CATEGORIES_COLLECTION,
  entityCategoryRecordSchema,
  patchEntityCategoryInputSchema,
  type CreateEntityCategoryInput,
  type EntityCategoryRecord,
  type PatchEntityCategoryInput,
} from "@repo/entity-categories";
import { nanoid } from "nanoid";

import type { EntityCategoryRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): EntityCategoryRecord {
  return entityCategoryRecordSchema.parse(data);
}

export function createFirestoreAdminEntityCategoryRepository(
  config: FirebaseAdminConfig,
): EntityCategoryRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      ENTITY_CATEGORIES_COLLECTION,
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
    async create(tenantId, input: CreateEntityCategoryInput) {
      const parsed = createEntityCategoryInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `cat_${nanoid(12)}`;
      const record = entityCategoryRecordSchema.parse({
        id,
        tenantId,
        name: parsed.name,
        icon: parsed.icon,
        order: parsed.order,
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async createWithId(tenantId, id, input: CreateEntityCategoryInput) {
      const parsed = createEntityCategoryInputSchema.parse(input);
      const existing = await this.getById(tenantId, id);
      if (existing) {
        throw new Error(`Entity category already exists: ${id}`);
      }
      const now = new Date().toISOString();
      const record = entityCategoryRecordSchema.parse({
        id,
        tenantId,
        name: parsed.name,
        icon: parsed.icon,
        order: parsed.order,
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchEntityCategoryInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Entity category not found: ${id}`);
      }

      patchEntityCategoryInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = entityCategoryRecordSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.icon ? { icon: input.icon } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async delete(tenantId, id) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Entity category not found: ${id}`);
      }
      await collection(tenantId).doc(id).delete();
    },
  };
}
