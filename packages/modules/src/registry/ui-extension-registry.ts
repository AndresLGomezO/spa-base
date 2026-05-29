import type { EntityUIExtension } from "../types.js";

const uiExtensionRegistry = new Map<string, EntityUIExtension[]>();

export function registerUiExtension(
  entityName: string,
  extension: EntityUIExtension,
): void {
  const existing = uiExtensionRegistry.get(entityName) ?? [];
  existing.push(extension);
  uiExtensionRegistry.set(entityName, existing);
}

export function getUiExtensions(
  entityName: string,
): readonly EntityUIExtension[] {
  return uiExtensionRegistry.get(entityName) ?? [];
}

export function clearUiExtensionRegistry(): void {
  uiExtensionRegistry.clear();
}
