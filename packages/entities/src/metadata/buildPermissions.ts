import type { EntityPermissions } from "../types.js";

export function buildPermissions<TName extends string>(
  name: TName,
): EntityPermissions<TName> {
  return [
    `${name}.read`,
    `${name}.create`,
    `${name}.update`,
    `${name}.delete`,
    `${name}.share`,
    `${name}.manage_shares`,
  ] as EntityPermissions<TName>;
}

export function defaultCollectionName(name: string): string {
  if (name.endsWith("s")) {
    return `${name}es`;
  }
  return `${name}s`;
}
