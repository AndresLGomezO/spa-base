import {
  createCustomViewInputSchema,
  CUSTOM_VIEWS_COLLECTION,
  customViewRecordSchema,
  patchCustomViewInputSchema,
  slugCustomViewId,
  type CreateCustomViewInput,
  type CustomViewRecord,
  type PatchCustomViewInput,
} from "@repo/custom-views";
import { nanoid } from "nanoid";

import type { CustomViewRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): CustomViewRecord {
  return customViewRecordSchema.parse(data);
}

export function createFirestoreAdminCustomViewRepository(
  config: FirebaseAdminConfig,
): CustomViewRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      CUSTOM_VIEWS_COLLECTION,
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
    async getByViewId(tenantId, viewId) {
      const normalized = viewId.trim().toLowerCase();
      const snapshot = await collection(tenantId)
        .where("viewId", "==", normalized)
        .limit(1)
        .get();
      const doc = snapshot.docs[0];
      if (!doc) return null;
      return toRecord({ id: doc.id, ...doc.data() });
    },
    async create(
      tenantId,
      input: CreateCustomViewInput & { readonly sourceEntity: string },
    ) {
      const { sourceEntity, ...createInput } = input;
      const parsed = createCustomViewInputSchema.parse(createInput);
      const viewId =
        parsed.viewId && parsed.viewId.trim().length > 0
          ? parsed.viewId.trim().toLowerCase()
          : slugCustomViewId(parsed.name);
      const existing = await this.getByViewId(tenantId, viewId);
      if (existing) {
        throw new Error(
          `Custom view with viewId "${parsed.viewId}" already exists.`,
        );
      }

      const now = new Date().toISOString();
      const id = `custom_view_${nanoid(12)}`;
      const record = customViewRecordSchema.parse({
        id,
        tenantId,
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        viewId:
          parsed.viewId?.trim().toLowerCase() ?? slugCustomViewId(parsed.name),
        entityQueryDefinitionId: parsed.entityQueryDefinitionId,
        sourceEntity,
        status: parsed.status,
        ...(parsed.hiddenFromNav !== undefined
          ? { hiddenFromNav: parsed.hiddenFromNav }
          : {}),
        ...(parsed.navCategoryId
          ? { navCategoryId: parsed.navCategoryId }
          : {}),
        ...(parsed.navOrder !== undefined ? { navOrder: parsed.navOrder } : {}),
        nav: parsed.nav,
        ui: parsed.ui ?? {
          views: [{ type: "table", name: "default", fields: ["id"] }],
          listViewType: "expandableTable",
        },
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(
      tenantId,
      id,
      input: PatchCustomViewInput & { readonly sourceEntity?: string },
    ) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Custom view not found: ${id}`);
      }

      const { sourceEntity, ...patchInput } = input;
      patchCustomViewInputSchema.parse(patchInput);
      const now = new Date().toISOString();

      const nextData: Record<string, unknown> = {
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.entityQueryDefinitionId
          ? { entityQueryDefinitionId: input.entityQueryDefinitionId }
          : {}),
        ...(sourceEntity ? { sourceEntity } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.hiddenFromNav !== undefined
          ? { hiddenFromNav: input.hiddenFromNav }
          : {}),
        ...(input.nav ? { nav: { ...current.nav, ...input.nav } } : {}),
        ...(input.ui
          ? {
              ui: {
                ...current.ui,
                ...input.ui,
                ...(input.ui.views ? { views: input.ui.views } : {}),
              },
            }
          : {}),
        updatedAt: now,
      };

      if (input.navCategoryId === null) {
        delete nextData.navCategoryId;
      } else if (input.navCategoryId !== undefined) {
        nextData.navCategoryId = input.navCategoryId;
      }

      if (input.navOrder === null) {
        delete nextData.navOrder;
      } else if (input.navOrder !== undefined) {
        nextData.navOrder = input.navOrder;
      }

      const next = customViewRecordSchema.parse(nextData);
      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async delete(tenantId, id) {
      await collection(tenantId).doc(id).delete();
    },
    async countByQueryDefinitionId(tenantId, entityQueryDefinitionId) {
      const snapshot = await collection(tenantId)
        .where("entityQueryDefinitionId", "==", entityQueryDefinitionId)
        .get();
      return snapshot.size;
    },
  };
}
