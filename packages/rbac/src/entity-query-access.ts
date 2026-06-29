import { hasPermission } from "./role-matcher.js";

export function canReadEntityQueryDefinition(
  sourceEntity: string,
  permissions: readonly string[],
  options?: { readonly isSuperAdmin?: boolean },
): boolean {
  const entity = sourceEntity.trim();
  if (entity.length === 0) {
    return false;
  }

  return (
    hasPermission("entityQueryDefinition.read", permissions, options) ||
    hasPermission(`${entity}.read`, permissions, options)
  );
}
