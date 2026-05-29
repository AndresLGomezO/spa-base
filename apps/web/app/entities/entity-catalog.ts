import type { SerializableEntityDefinition } from "@repo/entities";

export type EntityName = string;

export type EntityCatalogEntry = SerializableEntityDefinition;

export function formatFieldLabel(
  fieldName: string,
  definition?: EntityCatalogEntry,
): string {
  const fieldUI = definition?.ui.fields?.[fieldName];
  if (fieldUI?.label) {
    return fieldUI.label;
  }

  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export function getEntityLabel(definition: EntityCatalogEntry): string {
  return definition.ui.nav?.label ?? formatFieldLabel(definition.name);
}

export function getEntityIconName(
  definition: EntityCatalogEntry,
): string | undefined {
  return definition.ui.nav?.icon;
}

export function isEntityName(
  value: string,
  catalog: readonly EntityCatalogEntry[],
): value is EntityName {
  return catalog.some((entry) => entry.name === value);
}

export function getEntityDefinition(
  name: EntityName,
  catalog: readonly EntityCatalogEntry[],
): EntityCatalogEntry {
  const definition = catalog.find((entry) => entry.name === name);
  if (!definition) {
    throw new Error(`Unknown entity "${name}".`);
  }
  return definition;
}
