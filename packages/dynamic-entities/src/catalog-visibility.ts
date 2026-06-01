export const INTERNAL_ENTITY_READ_PERMISSION = "internalEntity.read" as const;

export const INTERNAL_ENTITY_PERMISSIONS = [
  INTERNAL_ENTITY_READ_PERMISSION,
] as const;

function permissionSet(
  permissions: ReadonlySet<string> | readonly string[],
): ReadonlySet<string> {
  return permissions instanceof Set ? permissions : new Set(permissions);
}

export function canIncludeEntityInCatalog(
  hiddenFromNav: boolean | undefined,
  permissions: ReadonlySet<string> | readonly string[],
  isSuperAdmin: boolean,
): boolean {
  if (!hiddenFromNav) {
    return true;
  }

  if (isSuperAdmin) {
    return true;
  }

  return permissionSet(permissions).has(INTERNAL_ENTITY_READ_PERMISSION);
}
