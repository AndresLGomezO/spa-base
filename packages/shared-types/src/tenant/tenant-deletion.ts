import { z } from "zod";

import { tenantSchemaV2 } from "./tenant.js";

export const TENANT_DELETION_JOBS_COLLECTION = "tenant_deletion_jobs" as const;
export const TENANT_DELETION_ARCHIVES_COLLECTION =
  "tenant_deletion_archives" as const;
export const TENANT_DELETION_ARCHIVE_MIRROR_SUBCOLLECTION = "mirror" as const;
export const TENANT_DELETION_ARCHIVE_MIRROR_ROOT_DOC = "_root" as const;

export const TENANT_DELETION_RETENTION_DAYS = 30 as const;

export const tenantDeletionJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
]);

export const tenantDeletionArchiveStatusSchema = z.enum([
  "archiving",
  "archived",
  "archiving_failed",
  "purged",
  "purge_failed",
]);

export const tenantDeletionJobProgressSchema = z
  .object({
    collectionsCopied: z.number().int().nonnegative().default(0),
    docsCopied: z.number().int().nonnegative().default(0),
    docsDeleted: z.number().int().nonnegative().default(0),
  })
  .strict();

export const tenantDeletionArchiveStatsSchema = z
  .object({
    collectionsCopied: z.number().int().nonnegative().default(0),
    docsCopied: z.number().int().nonnegative().default(0),
    docsDeleted: z.number().int().nonnegative().default(0),
    gcsObjectsDeleted: z.number().int().nonnegative().default(0),
  })
  .strict();

export const tenantDeletionJobRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
    archiveId: z.string().trim().min(1),
    status: tenantDeletionJobStatusSchema,
    deletedBy: z.string().trim().min(1).nullable(),
    createdAt: z.string().trim().min(1),
    startedAt: z.string().trim().min(1).nullable(),
    completedAt: z.string().trim().min(1).nullable(),
    error: z.string().nullable(),
    progress: tenantDeletionJobProgressSchema,
  })
  .strict();

export const tenantDeletionArchiveRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    sourceTenantId: z.string().trim().min(1),
    sourceTenantName: z.string().trim().min(1),
    deletedBy: z.string().trim().min(1).nullable(),
    deletedAt: z.string().trim().min(1),
    purgeAfter: z.string().trim().min(1),
    status: tenantDeletionArchiveStatusSchema,
    tenantSnapshot: tenantSchemaV2,
    stats: tenantDeletionArchiveStatsSchema,
  })
  .strict();

export type TenantDeletionJobStatus = z.infer<
  typeof tenantDeletionJobStatusSchema
>;
export type TenantDeletionArchiveStatus = z.infer<
  typeof tenantDeletionArchiveStatusSchema
>;
export type TenantDeletionJobProgress = z.infer<
  typeof tenantDeletionJobProgressSchema
>;
export type TenantDeletionArchiveStats = z.infer<
  typeof tenantDeletionArchiveStatsSchema
>;
export type TenantDeletionJobRecord = z.infer<
  typeof tenantDeletionJobRecordSchema
>;
export type TenantDeletionArchiveRecord = z.infer<
  typeof tenantDeletionArchiveRecordSchema
>;

export function computeTenantDeletionPurgeAfter(
  deletedAt: Date,
  retentionDays = TENANT_DELETION_RETENTION_DAYS,
): string {
  const purgeAt = new Date(deletedAt);
  purgeAt.setUTCDate(purgeAt.getUTCDate() + retentionDays);
  return purgeAt.toISOString();
}
