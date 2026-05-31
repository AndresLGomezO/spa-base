interface RecordAccessMeta {
  readonly isOwner: boolean;
  readonly sharePermission: "read" | "write" | null;
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly canDelete: boolean;
  readonly canManageShares: boolean;
}

export function getRecordAccess(
  record: Record<string, unknown>,
): RecordAccessMeta {
  const access = record._access;
  if (!access || typeof access !== "object" || Array.isArray(access)) {
    return {
      isOwner: false,
      sharePermission: null,
      canRead: true,
      canWrite: true,
      canDelete: true,
      canManageShares: false,
    };
  }

  const meta = access as Record<string, unknown>;
  return {
    isOwner: meta.isOwner === true,
    sharePermission:
      meta.sharePermission === "read" || meta.sharePermission === "write"
        ? meta.sharePermission
        : null,
    canRead: meta.canRead !== false,
    canWrite: meta.canWrite === true,
    canDelete: meta.canDelete === true,
    canManageShares: meta.canManageShares === true,
  };
}
