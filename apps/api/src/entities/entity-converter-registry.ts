import { getEntityConverter as getModuleEntityConverter } from "@repo/modules";

interface EntityConverter {
  read(raw: unknown): { readonly id: string; readonly tenantId: string };
  write(domain: unknown): unknown;
}

export function getEntityConverter(
  entityName: string,
): EntityConverter | undefined {
  return getModuleEntityConverter(entityName);
}
