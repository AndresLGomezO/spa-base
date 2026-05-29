import type { RbacRoleDefinition, RbacSlice, RbacSliceInput } from "./types.js";

function formatRoleLabel(roleId: string): string {
  return roleId
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function defineRbacSlice<
  const TPermissions extends readonly string[],
  const TRoles extends Record<string, RbacRoleDefinition>,
>(
  input: RbacSliceInput<TPermissions, TRoles>,
): RbacSlice<TPermissions, TRoles> {
  const roleLabels: Record<string, string> = {};
  for (const roleId of Object.keys(input.roles)) {
    roleLabels[roleId] =
      input.roleLabels?.[roleId as keyof TRoles & string] ??
      formatRoleLabel(roleId);
  }

  return {
    id: input.id,
    permissions: input.permissions,
    roles: input.roles,
    roleLabels,
  };
}
