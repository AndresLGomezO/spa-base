import type {
  FieldUIConfig,
  SerializableEntityDefinition,
} from "@repo/entities";

export interface EntityActionPermissions {
  readonly canRead: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function resolveEntityActionPermissions(
  entityName: string,
  permissions: readonly string[],
  isSuperAdmin?: boolean,
): EntityActionPermissions {
  if (isSuperAdmin) {
    return {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  const permissionSet = new Set(permissions);
  return {
    canRead: permissionSet.has(`${entityName}.read`),
    canCreate: permissionSet.has(`${entityName}.create`),
    canUpdate: permissionSet.has(`${entityName}.update`),
    canDelete: permissionSet.has(`${entityName}.delete`),
  };
}

export function isFieldVisible(
  fieldUI: FieldUIConfig | undefined,
  canRead: boolean,
): boolean {
  if (!canRead) return false;
  return fieldUI?.visible !== false;
}

export function isFieldEditable(
  fieldUI: FieldUIConfig | undefined,
  canWrite: boolean,
): boolean {
  if (!canWrite) return false;
  return fieldUI?.editable !== false;
}

export function canAccessView(
  entityName: string,
  permissions: readonly string[],
  isSuperAdmin?: boolean,
): boolean {
  return resolveEntityActionPermissions(entityName, permissions, isSuperAdmin)
    .canRead;
}

export function filterNavEntities(
  definitions: readonly SerializableEntityDefinition[],
  permissions: readonly string[],
  isSuperAdmin?: boolean,
): SerializableEntityDefinition[] {
  return definitions.filter((definition) =>
    canAccessView(definition.name, permissions, isSuperAdmin),
  );
}
