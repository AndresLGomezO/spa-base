/**
 * In-memory registry for defined entities. Intended for future defineApp({ entities }).
 *
 * Values are stored as AnyDefinedEntity (widened types) — import concrete entities
 * (e.g. Customer) when you need precise field typing. See README for details.
 */
import type { DefinedEntity, FieldDefinitions } from "../types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const entityRegistry = new Map<string, AnyDefinedEntity>();

export function registerEntity<
  TName extends string,
  TFields extends FieldDefinitions,
>(entity: DefinedEntity<TName, TFields>): void {
  entityRegistry.set(entity.name, entity as AnyDefinedEntity);
}

export function getEntity(name: string): AnyDefinedEntity | undefined {
  return entityRegistry.get(name);
}

export function getAllEntities(): ReadonlyArray<AnyDefinedEntity> {
  return [...entityRegistry.values()];
}

export function clearEntityRegistry(): void {
  entityRegistry.clear();
}
