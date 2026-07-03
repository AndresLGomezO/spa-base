import {
  tenantDeletionArchiveRecordSchema,
  tenantDeletionJobRecordSchema,
  type Tenant,
  type TenantDeletionArchiveRecord,
  type TenantDeletionJobRecord,
} from "@repo/shared-types";

export {
  tenantDeletionArchiveRecordSchema,
  tenantDeletionJobRecordSchema,
  type TenantDeletionArchiveRecord,
  type TenantDeletionArchiveStats,
  type TenantDeletionArchiveStatus,
  type TenantDeletionJobProgress,
  type TenantDeletionJobRecord,
  type TenantDeletionJobStatus,
} from "@repo/shared-types";

export interface CreateTenantDeletionJobInput {
  readonly tenantId: string;
  readonly archiveId: string;
  readonly deletedBy: string | null;
}

export interface CreateTenantDeletionArchiveInput {
  readonly sourceTenantId: string;
  readonly sourceTenantName: string;
  readonly deletedBy: string | null;
  readonly tenantSnapshot: Tenant;
  readonly deletedAt: string;
  readonly purgeAfter: string;
}

export interface TenantDeletionJobRepository {
  create(input: CreateTenantDeletionJobInput): Promise<TenantDeletionJobRecord>;
  getById(id: string): Promise<TenantDeletionJobRecord | null>;
  findActiveByTenantId(
    tenantId: string,
  ): Promise<TenantDeletionJobRecord | null>;
  update(
    id: string,
    patch: Partial<
      Pick<
        TenantDeletionJobRecord,
        | "status"
        | "startedAt"
        | "completedAt"
        | "error"
        | "progress"
      >
    >,
  ): Promise<TenantDeletionJobRecord>;
}

export interface TenantDeletionArchiveRepository {
  create(
    input: CreateTenantDeletionArchiveInput,
  ): Promise<TenantDeletionArchiveRecord>;
  getById(id: string): Promise<TenantDeletionArchiveRecord | null>;
  list(): Promise<readonly TenantDeletionArchiveRecord[]>;
  listReadyForPurge(
    nowIso: string,
  ): Promise<readonly TenantDeletionArchiveRecord[]>;
  update(
    id: string,
    patch: Partial<
      Pick<TenantDeletionArchiveRecord, "status" | "stats">
    >,
  ): Promise<TenantDeletionArchiveRecord>;
}
