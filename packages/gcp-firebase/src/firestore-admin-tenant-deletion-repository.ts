import { randomUUID } from "node:crypto";

import {
  tenantDeletionArchiveRecordSchema,
  tenantDeletionJobRecordSchema,
  type CreateTenantDeletionArchiveInput,
  type CreateTenantDeletionJobInput,
  type TenantDeletionArchiveRepository,
  type TenantDeletionJobRepository,
} from "@repo/firestore-converters";
import {
  TENANT_DELETION_ARCHIVES_COLLECTION,
  TENANT_DELETION_JOBS_COLLECTION,
} from "@repo/shared-types";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

const ACTIVE_JOB_STATUSES = ["queued", "running"] as const;

export function createFirestoreAdminTenantDeletionJobRepository(
  config: FirebaseAdminConfig,
): TenantDeletionJobRepository {
  function collection() {
    return getFirestoreAdmin(config).collection(
      TENANT_DELETION_JOBS_COLLECTION,
    );
  }

  return {
    async create(input: CreateTenantDeletionJobInput) {
      const now = new Date().toISOString();
      const id = `tdjob_${randomUUID()}`;
      const record = tenantDeletionJobRecordSchema.parse({
        id,
        tenantId: input.tenantId,
        archiveId: input.archiveId,
        status: "queued",
        deletedBy: input.deletedBy,
        createdAt: now,
        startedAt: null,
        completedAt: null,
        error: null,
        progress: {
          collectionsCopied: 0,
          docsCopied: 0,
          docsDeleted: 0,
        },
      });
      await collection().doc(id).set(record);
      return record;
    },
    async getById(id) {
      const snapshot = await collection().doc(id).get();
      if (!snapshot.exists) return null;
      return tenantDeletionJobRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async findActiveByTenantId(tenantId) {
      for (const status of ACTIVE_JOB_STATUSES) {
        const snapshot = await collection()
          .where("tenantId", "==", tenantId)
          .where("status", "==", status)
          .limit(1)
          .get();
        const doc = snapshot.docs[0];
        if (doc) {
          return tenantDeletionJobRecordSchema.parse({
            id: doc.id,
            ...doc.data(),
          });
        }
      }
      return null;
    },
    async update(id, patch) {
      const current = await this.getById(id);
      if (!current) {
        throw new Error(`Tenant deletion job not found: ${id}`);
      }
      const next = tenantDeletionJobRecordSchema.parse({
        ...current,
        ...patch,
        progress: patch.progress
          ? { ...current.progress, ...patch.progress }
          : current.progress,
      });
      await collection().doc(id).set(next);
      return next;
    },
  };
}

export function createFirestoreAdminTenantDeletionArchiveRepository(
  config: FirebaseAdminConfig,
): TenantDeletionArchiveRepository {
  function collection() {
    return getFirestoreAdmin(config).collection(
      TENANT_DELETION_ARCHIVES_COLLECTION,
    );
  }

  return {
    async create(input: CreateTenantDeletionArchiveInput) {
      const id = `tdarch_${randomUUID()}`;
      const record = tenantDeletionArchiveRecordSchema.parse({
        id,
        sourceTenantId: input.sourceTenantId,
        sourceTenantName: input.sourceTenantName,
        deletedBy: input.deletedBy,
        deletedAt: input.deletedAt,
        purgeAfter: input.purgeAfter,
        status: "archiving",
        tenantSnapshot: input.tenantSnapshot,
        stats: {
          collectionsCopied: 0,
          docsCopied: 0,
          docsDeleted: 0,
          gcsObjectsDeleted: 0,
        },
      });
      await collection().doc(id).set(record);
      return record;
    },
    async getById(id) {
      const snapshot = await collection().doc(id).get();
      if (!snapshot.exists) return null;
      return tenantDeletionArchiveRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async list() {
      const snapshot = await collection().get();
      return snapshot.docs
        .map((doc) =>
          tenantDeletionArchiveRecordSchema.parse({
            id: doc.id,
            ...doc.data(),
          }),
        )
        .sort((left, right) => right.deletedAt.localeCompare(left.deletedAt));
    },
    async listReadyForPurge(nowIso) {
      const snapshot = await collection()
        .where("status", "==", "archived")
        .where("purgeAfter", "<=", nowIso)
        .get();
      return snapshot.docs
        .map((doc) =>
          tenantDeletionArchiveRecordSchema.parse({
            id: doc.id,
            ...doc.data(),
          }),
        )
        .sort((left, right) => left.purgeAfter.localeCompare(right.purgeAfter));
    },
    async update(id, patch) {
      const current = await this.getById(id);
      if (!current) {
        throw new Error(`Tenant deletion archive not found: ${id}`);
      }
      const next = tenantDeletionArchiveRecordSchema.parse({
        ...current,
        ...patch,
        stats: patch.stats ? { ...current.stats, ...patch.stats } : current.stats,
      });
      await collection().doc(id).set(next);
      return next;
    },
  };
}
