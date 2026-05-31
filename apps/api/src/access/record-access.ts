interface RecordAccessResult {
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly canDelete: boolean;
  readonly isOwner: boolean;
  readonly sharePermission: "read" | "write" | null;
}

/**
 * Determines the calling user's access rights to a specific record
 * based strictly on ownership and explicit sharing.
 * No role — including superadmin — bypasses this check.
 */
export function checkRecordAccess(
  record: Record<string, unknown>,
  userId: string,
): RecordAccessResult {
  const isOwner = record.ownerId === userId;

  const sharedWith = record.sharedWith as
    | Readonly<Record<string, string>>
    | undefined;
  const sharePermission =
    sharedWith && typeof sharedWith === "object"
      ? ((sharedWith[userId] as "read" | "write" | undefined) ?? null)
      : null;

  const canRead = isOwner || sharePermission !== null;
  const canWrite = isOwner || sharePermission === "write";
  const canDelete = isOwner;

  return { canRead, canWrite, canDelete, isOwner, sharePermission };
}
