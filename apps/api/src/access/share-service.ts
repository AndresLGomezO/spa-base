import type { SharePermission } from "@repo/entities";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";

import type { AuditLogWriter } from "../audit/audit-log.js";
import {
  canManageShares,
  countShares,
  MAX_SHARES_PER_RECORD,
  type RecordAccessContext,
} from "./record-access.js";

export class ShareError extends Error {
  constructor(
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "VALIDATION_ERROR"
      | "SHARE_LIMIT",
    message: string,
  ) {
    super(message);
    this.name = "ShareError";
  }
}

interface ShareServiceDeps {
  readonly auditLog: AuditLogWriter;
  readonly isTenantMember: (
    tenantId: string,
    userId: string,
  ) => Promise<boolean>;
  readonly getRepository: (
    tenantId: string,
    entityName: string,
  ) => TenantScopedEntityRepository<
    { readonly id: string; readonly tenantId: string },
    Record<string, unknown>
  > | null;
}

interface ShareListItem {
  readonly userId: string;
  readonly permission: SharePermission;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readSharedWith(
  record: Record<string, unknown>,
): Record<string, SharePermission> {
  const sharedWith = record.sharedWith;
  if (
    !sharedWith ||
    typeof sharedWith !== "object" ||
    Array.isArray(sharedWith)
  ) {
    return {};
  }

  const result: Record<string, SharePermission> = {};
  for (const [userId, permission] of Object.entries(
    sharedWith as Record<string, unknown>,
  )) {
    if (permission === "read" || permission === "write") {
      result[userId] = permission;
    }
  }
  return result;
}

function toShareList(
  record: Record<string, unknown>,
): readonly ShareListItem[] {
  return Object.entries(readSharedWith(record)).map(([userId, permission]) => ({
    userId,
    permission,
  }));
}

function buildAccessUserIds(
  ownerId: string,
  sharedWith: Record<string, SharePermission>,
): string[] {
  return [...new Set([ownerId, ...Object.keys(sharedWith)])];
}

export function createShareService(deps: ShareServiceDeps) {
  async function loadRecord(
    tenantId: string,
    entityName: string,
    recordId: string,
  ): Promise<Record<string, unknown> | null> {
    const repository = deps.getRepository(tenantId, entityName);
    if (!repository) {
      throw new ShareError("NOT_FOUND", "Entity not found.");
    }

    const record = await repository.findById(recordId, tenantId);
    return record ? asRecord(record) : null;
  }

  return {
    async listShares(params: {
      readonly tenantId: string;
      readonly entityName: string;
      readonly recordId: string;
      readonly context: RecordAccessContext;
    }): Promise<readonly ShareListItem[]> {
      const record = await loadRecord(
        params.tenantId,
        params.entityName,
        params.recordId,
      );
      if (!record) {
        throw new ShareError("NOT_FOUND", "Record not found.");
      }

      if (!canManageShares(record, params.entityName, params.context)) {
        throw new ShareError("FORBIDDEN", "Not allowed to view shares.");
      }

      return toShareList(record);
    },

    async grantShare(params: {
      readonly tenantId: string;
      readonly entityName: string;
      readonly recordId: string;
      readonly targetUserId: string;
      readonly permission: SharePermission;
      readonly context: RecordAccessContext;
    }): Promise<readonly ShareListItem[]> {
      if (params.targetUserId === params.context.userId) {
        throw new ShareError("VALIDATION_ERROR", "Cannot share with yourself.");
      }

      if (!(await deps.isTenantMember(params.tenantId, params.targetUserId))) {
        throw new ShareError(
          "VALIDATION_ERROR",
          "Target user is not a tenant member.",
        );
      }

      const repository = deps.getRepository(params.tenantId, params.entityName);
      if (!repository) {
        throw new ShareError("NOT_FOUND", "Entity not found.");
      }

      const existing = await repository.findById(
        params.recordId,
        params.tenantId,
      );
      const record = existing ? asRecord(existing) : null;
      if (!record) {
        throw new ShareError("NOT_FOUND", "Record not found.");
      }

      if (!canManageShares(record, params.entityName, params.context)) {
        throw new ShareError("FORBIDDEN", "Not allowed to manage shares.");
      }

      const sharedWith = readSharedWith(record);
      const isNewShare = sharedWith[params.targetUserId] === undefined;
      if (isNewShare && countShares(record) >= MAX_SHARES_PER_RECORD) {
        throw new ShareError(
          "SHARE_LIMIT",
          `Maximum of ${MAX_SHARES_PER_RECORD} shares per record.`,
        );
      }

      const ownerId =
        typeof record.ownerId === "string"
          ? record.ownerId
          : params.context.userId;
      const nextSharedWith = {
        ...sharedWith,
        [params.targetUserId]: params.permission,
      };

      const updated = await repository.update(
        params.recordId,
        params.tenantId,
        {
          sharedWith: nextSharedWith,
          accessUserIds: buildAccessUserIds(ownerId, nextSharedWith),
          updatedAt: new Date().toISOString(),
          updatedBy: params.context.userId,
        },
      );

      if (!updated) {
        throw new ShareError("NOT_FOUND", "Record not found.");
      }

      await deps.auditLog.write(params.tenantId, {
        action: "share_granted",
        entity: params.entityName,
        recordId: params.recordId,
        actorId: params.context.userId,
        targetUserId: params.targetUserId,
        permission: params.permission,
        timestamp: new Date().toISOString(),
      });

      return toShareList(updated as Record<string, unknown>);
    },

    async revokeShare(params: {
      readonly tenantId: string;
      readonly entityName: string;
      readonly recordId: string;
      readonly targetUserId: string;
      readonly context: RecordAccessContext;
    }): Promise<readonly ShareListItem[]> {
      const repository = deps.getRepository(params.tenantId, params.entityName);
      if (!repository) {
        throw new ShareError("NOT_FOUND", "Entity not found.");
      }

      const existing = await repository.findById(
        params.recordId,
        params.tenantId,
      );
      const record = existing ? asRecord(existing) : null;
      if (!record) {
        throw new ShareError("NOT_FOUND", "Record not found.");
      }

      if (!canManageShares(record, params.entityName, params.context)) {
        throw new ShareError("FORBIDDEN", "Not allowed to manage shares.");
      }

      const sharedWith = readSharedWith(record);
      if (!sharedWith[params.targetUserId]) {
        throw new ShareError("NOT_FOUND", "Share not found.");
      }

      const nextSharedWith = { ...sharedWith };
      delete nextSharedWith[params.targetUserId];
      const ownerId =
        typeof record.ownerId === "string"
          ? record.ownerId
          : params.context.userId;

      const updated = await repository.update(
        params.recordId,
        params.tenantId,
        {
          sharedWith: nextSharedWith,
          accessUserIds: buildAccessUserIds(ownerId, nextSharedWith),
          updatedAt: new Date().toISOString(),
          updatedBy: params.context.userId,
        },
      );

      if (!updated) {
        throw new ShareError("NOT_FOUND", "Record not found.");
      }

      await deps.auditLog.write(params.tenantId, {
        action: "share_revoked",
        entity: params.entityName,
        recordId: params.recordId,
        actorId: params.context.userId,
        targetUserId: params.targetUserId,
        timestamp: new Date().toISOString(),
      });

      return toShareList(updated as Record<string, unknown>);
    },
  };
}

export type ShareService = ReturnType<typeof createShareService>;
