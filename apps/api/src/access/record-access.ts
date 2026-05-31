import { hasPermission } from "@repo/rbac";
import type { SharePermission } from "@repo/entities";

export interface RecordAccessContext {
  readonly userId: string;
  readonly permissions: readonly string[];
  readonly isSuperAdmin?: boolean;
}

export interface EntityAccessConfig {
  readonly tenantWideRead?: boolean;
}

type RecordRelation = "owner" | "read" | "write" | "none";

interface RecordAccessMeta {
  readonly isOwner: boolean;
  readonly sharePermission: SharePermission | null;
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly canDelete: boolean;
  readonly canManageShares: boolean;
}

const PROTECTED_UPDATE_FIELDS = new Set([
  "ownerId",
  "createdBy",
  "accessUserIds",
  "sharedWith",
]);

export function isProtectedOwnershipField(field: string): boolean {
  return PROTECTED_UPDATE_FIELDS.has(field);
}

function getSharePermission(
  record: Record<string, unknown>,
  userId: string,
): SharePermission | null {
  const sharedWith = record.sharedWith;
  if (
    !sharedWith ||
    typeof sharedWith !== "object" ||
    Array.isArray(sharedWith)
  ) {
    return null;
  }

  const permission = (sharedWith as Record<string, unknown>)[userId];
  if (permission === "read" || permission === "write") {
    return permission;
  }
  return null;
}

function getRecordRelation(
  record: Record<string, unknown>,
  userId: string,
): RecordRelation {
  if (record.ownerId === userId) {
    return "owner";
  }

  const sharePermission = getSharePermission(record, userId);
  if (sharePermission === "write") {
    return "write";
  }
  if (sharePermission === "read") {
    return "read";
  }

  return "none";
}

function hasEntityPermission(
  entityName: string,
  permissionSuffix: string,
  context: RecordAccessContext,
): boolean {
  if (context.isSuperAdmin) {
    return true;
  }
  return hasPermission(`${entityName}.${permissionSuffix}`, [
    ...context.permissions,
  ]);
}

export function shouldBypassOwnershipFilter(
  entityName: string,
  context: RecordAccessContext,
  entityConfig?: EntityAccessConfig,
): boolean {
  if (context.isSuperAdmin) {
    return true;
  }
  if (entityConfig?.tenantWideRead) {
    return true;
  }
  return hasEntityPermission(entityName, "read_all", context);
}

export function canReadRecord(
  record: Record<string, unknown>,
  entityName: string,
  context: RecordAccessContext,
  entityConfig?: EntityAccessConfig,
): boolean {
  if (shouldBypassOwnershipFilter(entityName, context, entityConfig)) {
    return true;
  }

  const accessUserIds = record.accessUserIds;
  if (Array.isArray(accessUserIds) && accessUserIds.includes(context.userId)) {
    return true;
  }

  return getRecordRelation(record, context.userId) !== "none";
}

export function canWriteRecord(
  record: Record<string, unknown>,
  entityName: string,
  context: RecordAccessContext,
): boolean {
  if (context.isSuperAdmin) {
    return true;
  }
  if (hasEntityPermission(entityName, "write_all", context)) {
    return true;
  }

  const relation = getRecordRelation(record, context.userId);
  return relation === "owner" || relation === "write";
}

export function canDeleteRecord(
  record: Record<string, unknown>,
  entityName: string,
  context: RecordAccessContext,
): boolean {
  if (context.isSuperAdmin) {
    return true;
  }
  if (hasEntityPermission(entityName, "delete_all", context)) {
    return true;
  }
  return getRecordRelation(record, context.userId) === "owner";
}

export function canManageShares(
  record: Record<string, unknown>,
  entityName: string,
  context: RecordAccessContext,
): boolean {
  if (context.isSuperAdmin) {
    return true;
  }
  if (hasEntityPermission(entityName, "manage_shares", context)) {
    return true;
  }
  return getRecordRelation(record, context.userId) === "owner";
}

export function buildRecordAccessMeta(
  record: Record<string, unknown>,
  entityName: string,
  context: RecordAccessContext,
  entityConfig?: EntityAccessConfig,
): RecordAccessMeta {
  const relation = getRecordRelation(record, context.userId);
  const sharePermission =
    relation === "read" || relation === "write" ? relation : null;

  return {
    isOwner: relation === "owner",
    sharePermission,
    canRead: canReadRecord(record, entityName, context, entityConfig),
    canWrite: canWriteRecord(record, entityName, context),
    canDelete: canDeleteRecord(record, entityName, context),
    canManageShares: canManageShares(record, entityName, context),
  };
}

export function enrichRecordWithAccess(
  record: Record<string, unknown>,
  entityName: string,
  context: RecordAccessContext,
  entityConfig?: EntityAccessConfig,
): Record<string, unknown> {
  return {
    ...record,
    _access: buildRecordAccessMeta(record, entityName, context, entityConfig),
  };
}

export function buildInitialOwnershipFields(userId: string): {
  readonly ownerId: string;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly accessUserIds: readonly [string];
  readonly sharedWith: Record<string, never>;
} {
  return {
    ownerId: userId,
    createdBy: userId,
    updatedBy: userId,
    accessUserIds: [userId],
    sharedWith: {},
  };
}

export const MAX_SHARES_PER_RECORD = 100;

export function countShares(record: Record<string, unknown>): number {
  const sharedWith = record.sharedWith;
  if (
    !sharedWith ||
    typeof sharedWith !== "object" ||
    Array.isArray(sharedWith)
  ) {
    return 0;
  }
  return Object.keys(sharedWith).length;
}
