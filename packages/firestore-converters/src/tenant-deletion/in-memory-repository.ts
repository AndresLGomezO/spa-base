import { randomUUID } from "node:crypto";

import {
  tenantDeletionArchiveRecordSchema,
  tenantDeletionJobRecordSchema,
  type CreateTenantDeletionArchiveInput,
  type CreateTenantDeletionJobInput,
  type TenantDeletionArchiveRecord,
  type TenantDeletionArchiveRepository,
  type TenantDeletionJobRecord,
  type TenantDeletionJobRepository,
} from "./repository-contract.js";

const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);

export function createInMemoryTenantDeletionJobRepository(): TenantDeletionJobRepository & {
  readonly store: Map<string, TenantDeletionJobRecord>;
} {
  const store = new Map<string, TenantDeletionJobRecord>();

  return {
    store,
    async create(input: CreateTenantDeletionJobInput) {
      const now = new Date().toISOString();
      const record = tenantDeletionJobRecordSchema.parse({
        id: `tdjob_${randomUUID()}`,
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
      store.set(record.id, record);
      return record;
    },
    async getById(id) {
      return store.get(id) ?? null;
    },
    async findActiveByTenantId(tenantId) {
      for (const record of store.values()) {
        if (
          record.tenantId === tenantId &&
          ACTIVE_JOB_STATUSES.has(record.status)
        ) {
          return record;
        }
      }
      return null;
    },
    async update(id, patch) {
      const current = store.get(id);
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
      store.set(id, next);
      return next;
    },
  };
}

export function createInMemoryTenantDeletionArchiveRepository(): TenantDeletionArchiveRepository & {
  readonly store: Map<string, TenantDeletionArchiveRecord>;
} {
  const store = new Map<string, TenantDeletionArchiveRecord>();

  return {
    store,
    async create(input: CreateTenantDeletionArchiveInput) {
      const record = tenantDeletionArchiveRecordSchema.parse({
        id: `tdarch_${randomUUID()}`,
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
      store.set(record.id, record);
      return record;
    },
    async getById(id) {
      return store.get(id) ?? null;
    },
    async list() {
      return [...store.values()].sort((left, right) =>
        right.deletedAt.localeCompare(left.deletedAt),
      );
    },
    async listReadyForPurge(nowIso) {
      return [...store.values()]
        .filter(
          (record) =>
            record.status === "archived" && record.purgeAfter <= nowIso,
        )
        .sort((left, right) => left.purgeAfter.localeCompare(right.purgeAfter));
    },
    async update(id, patch) {
      const current = store.get(id);
      if (!current) {
        throw new Error(`Tenant deletion archive not found: ${id}`);
      }
      const next = tenantDeletionArchiveRecordSchema.parse({
        ...current,
        ...patch,
        stats: patch.stats
          ? { ...current.stats, ...patch.stats }
          : current.stats,
      });
      store.set(id, next);
      return next;
    },
  };
}
