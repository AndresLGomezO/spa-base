import { hasPermission } from "@repo/rbac";

interface RecordAccessResult {
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly canDelete: boolean;
  readonly isOwner: boolean;
  readonly sharePermission: "read" | "write" | null;
}

/**
 * Determines the calling user's access rights to a specific record
 * based on ownership, sharing, and elevated permissions.
 */
export function checkRecordAccess(
  record: Record<string, unknown>,
  userId: string,
  permissions: readonly string[],
  entityName: string,
  isSuperAdmin?: boolean,
): RecordAccessResult {
  if (isSuperAdmin) {
    return {
      canRead: true,
      canWrite: true,
      canDelete: true,
      isOwner: record.ownerId === userId,
      sharePermission: null,
    };
  }

  const isOwner = record.ownerId === userId;
  const hasReadAll = hasPermission(`${entityName}.read_all`, [...permissions]);
  const hasWriteAll = hasPermission(`${entityName}.write_all`, [
    ...permissions,
  ]);
  const hasDeleteAll = hasPermission(`${entityName}.delete_all`, [
    ...permissions,
  ]);

  const sharedWith = record.sharedWith as
    | Readonly<Record<string, string>>
    | undefined;
  const sharePermission =
    sharedWith && typeof sharedWith === "object"
      ? ((sharedWith[userId] as "read" | "write" | undefined) ?? null)
      : null;

  const canRead =
    isOwner || hasReadAll || hasWriteAll || sharePermission !== null;
  const canWrite = isOwner || hasWriteAll || sharePermission === "write";
  const canDelete = isOwner || hasDeleteAll;

  return { canRead, canWrite, canDelete, isOwner, sharePermission };
}
