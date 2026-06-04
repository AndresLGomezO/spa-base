import {
  applyDisplayFieldToRecord,
  applyHiddenFromNav,
  applyNavCategoryId,
  applyNavOrder,
  applyInMemoryListQueries,
  applyTenantWideRead,
  displayFieldForCreate,
  entityDefinitionRecordSchema,
  ENTITY_DEFINITIONS_COLLECTION,
  type CreateEntityDefinitionInput,
  type EntityDefinitionRecord,
  type PatchEntityDefinitionInput,
} from "@repo/dynamic-entities";
import { nanoid } from "nanoid";

import type { EntityDefinitionRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): EntityDefinitionRecord {
  return entityDefinitionRecordSchema.parse(data);
}

export function createFirestoreAdminEntityDefinitionRepository(
  config: FirebaseAdminConfig,
): EntityDefinitionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      ENTITY_DEFINITIONS_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs
        .map((doc) => toRecord({ id: doc.id, ...doc.data() }))
        .sort((left, right) => left.label.localeCompare(right.label));
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async getByName(tenantId, name) {
      const snapshot = await collection(tenantId)
        .where("name", "==", name)
        .limit(1)
        .get();
      const doc = snapshot.docs[0];
      if (!doc) return null;
      return toRecord({ id: doc.id, ...doc.data() });
    },
    async create(tenantId, input: CreateEntityDefinitionInput) {
      const existing = await this.getByName(tenantId, input.name);
      if (existing) {
        throw new Error(`Entity definition "${input.name}" already exists.`);
      }

      const now = new Date().toISOString();
      const id = `def_${nanoid(12)}`;
      const record = entityDefinitionRecordSchema.parse({
        id,
        tenantId,
        name: input.name,
        label: input.label,
        fields: input.fields,
        ...(input.ui ? { ui: input.ui } : {}),
        ...(input.tenantWideRead === true ? { tenantWideRead: true } : {}),
        ...(input.inMemoryListQueries === true
          ? { inMemoryListQueries: true }
          : {}),
        ...(input.hiddenFromNav === true ? { hiddenFromNav: true } : {}),
        ...(input.navCategoryId ? { navCategoryId: input.navCategoryId } : {}),
        ...(input.navOrder !== undefined ? { navOrder: input.navOrder } : {}),
        ...displayFieldForCreate(input),
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchEntityDefinitionInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Entity definition not found: ${id}`);
      }

      const now = new Date().toISOString();
      const base = applyNavOrder(
        applyNavCategoryId(
          applyHiddenFromNav(
            applyInMemoryListQueries(
              applyTenantWideRead(
                applyDisplayFieldToRecord(
                  {
                    ...current,
                    ...(input.label ? { label: input.label } : {}),
                    ...(input.fields ? { fields: input.fields } : {}),
                    version: current.version + 1,
                    updatedAt: now,
                  },
                  input,
                ),
                input.tenantWideRead,
              ),
              input.inMemoryListQueries,
            ),
            input.hiddenFromNav,
          ),
          input.navCategoryId,
        ),
        input.navOrder,
      );
      const withoutUi = { ...base };
      Reflect.deleteProperty(withoutUi, "ui");
      const next = entityDefinitionRecordSchema.parse({
        ...(input.fields && !input.ui ? withoutUi : base),
        ...(input.ui ? { ui: input.ui } : {}),
      });

      await collection(tenantId).doc(id).set(next);
      return next;
    },
  };
}
