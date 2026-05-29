import {
  getAllEntities,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";

import { defineEntityFromRecord } from "./define-entity-from-record.js";
import type { EntityDefinitionRecord } from "./types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const dynamicEntities = new Map<string, AnyDefinedEntity>();

function cacheKey(tenantId: string, name: string): string {
  return `${tenantId}:${name}`;
}

export function registerDynamicEntity(
  tenantId: string,
  record: EntityDefinitionRecord,
): AnyDefinedEntity {
  const entity = defineEntityFromRecord(record);
  dynamicEntities.set(cacheKey(tenantId, record.name), entity);
  return entity;
}

export function unregisterDynamicEntity(tenantId: string, name: string): void {
  dynamicEntities.delete(cacheKey(tenantId, name));
}

export function getDynamicEntity(
  tenantId: string,
  name: string,
): AnyDefinedEntity | undefined {
  return dynamicEntities.get(cacheKey(tenantId, name));
}

export function getDynamicEntitiesForTenant(
  tenantId: string,
): readonly AnyDefinedEntity[] {
  const prefix = `${tenantId}:`;
  return [...dynamicEntities.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .map(([, entity]) => entity);
}

export function getEntitiesForTenant(
  tenantId: string,
): readonly AnyDefinedEntity[] {
  return [...getAllEntities(), ...getDynamicEntitiesForTenant(tenantId)];
}

export function resolveEntity(
  name: string,
  tenantId: string,
): AnyDefinedEntity | undefined {
  const staticEntity = getAllEntities().find((entity) => entity.name === name);
  const dynamicEntity = getDynamicEntity(tenantId, name);
  return staticEntity ?? dynamicEntity;
}

export function isDynamicEntityName(tenantId: string, name: string): boolean {
  return dynamicEntities.has(cacheKey(tenantId, name));
}

export function clearDynamicEntityRegistry(): void {
  dynamicEntities.clear();
}

export function hydrateDynamicEntities(
  records: readonly EntityDefinitionRecord[],
): void {
  clearDynamicEntityRegistry();
  for (const record of records) {
    registerDynamicEntity(record.tenantId, record);
  }
}

export function getDynamicPermissionsForTenant(
  tenantId: string,
): readonly string[] {
  return getDynamicEntitiesForTenant(tenantId).flatMap(
    (entity) => entity.metadata.permissions,
  );
}
