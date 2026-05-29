import {
  createTenantRoleInputSchema,
  patchTenantRoleInputSchema,
  TENANT_ROLES_SUBCOLLECTION,
  tenantRoleRecordSchema,
  type CreateTenantRoleInput,
  type PatchTenantRoleInput,
  type TenantRoleRecord,
} from "@repo/rbac";
import { nanoid } from "nanoid";

import type { TenantRoleRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): TenantRoleRecord {
  return tenantRoleRecordSchema.parse(data);
}

export function createFirestoreAdminTenantRoleRepository(
  config: FirebaseAdminConfig,
): TenantRoleRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      TENANT_ROLES_SUBCOLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs
        .map((doc) => toRecord({ id: doc.id, ...doc.data() }))
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async getByName(tenantId, name) {
      const normalized = name.trim();
      if (!normalized) return null;

      const snapshot = await collection(tenantId)
        .where("name", "==", normalized)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      if (!doc) return null;
      return toRecord({ id: doc.id, ...doc.data() });
    },
    async create(tenantId, input: CreateTenantRoleInput) {
      const parsed = createTenantRoleInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `role_${nanoid(12)}`;
      const record = tenantRoleRecordSchema.parse({
        id,
        tenantId,
        name: parsed.name,
        description: parsed.description,
        grants: parsed.grants,
        fieldRules: parsed.fieldRules,
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchTenantRoleInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Tenant role not found: ${id}`);
      }

      patchTenantRoleInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = tenantRoleRecordSchema.parse({
        ...current,
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.grants ? { grants: input.grants } : {}),
        ...(input.fieldRules !== undefined
          ? { fieldRules: input.fieldRules }
          : {}),
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async ensureFromTemplate(tenantId, template) {
      const existing = await this.getByName(tenantId, template.name);
      if (existing) {
        return;
      }

      const now = new Date().toISOString();
      const record: TenantRoleRecord = tenantRoleRecordSchema.parse({
        id: template.name,
        tenantId,
        name: template.name,
        description: template.description,
        grants: [...template.grants],
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(record.id).set(record);
    },
  };
}
