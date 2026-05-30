import { getEntityConverter as getModuleEntityConverter } from "@repo/modules";
import {
  customerConverter,
  organizationConverter,
  projectConverter,
} from "@repo/firestore-converters";

interface EntityConverter {
  read(raw: unknown): { readonly id: string; readonly tenantId: string };
  write(domain: unknown): unknown;
}

const SEED_ENTITY_CONVERTERS: Record<string, EntityConverter> = {
  customer: customerConverter,
  organization: organizationConverter,
  project: projectConverter,
};

export function getEntityConverter(
  entityName: string,
): EntityConverter | undefined {
  return (
    getModuleEntityConverter(entityName) ?? SEED_ENTITY_CONVERTERS[entityName]
  );
}
