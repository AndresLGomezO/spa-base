import type { EntityConverter } from "../types.js";

const converterRegistry = new Map<string, EntityConverter>();

export function registerEntityConverter(
  entityName: string,
  converter: EntityConverter,
): void {
  converterRegistry.set(entityName, converter);
}

export function getEntityConverter(
  entityName: string,
): EntityConverter | undefined {
  return converterRegistry.get(entityName);
}

export function getAllEntityConverters(): ReadonlyMap<string, EntityConverter> {
  return converterRegistry;
}

export function clearConverterRegistry(): void {
  converterRegistry.clear();
}
