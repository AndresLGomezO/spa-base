import { getAllEntities } from "@repo/entities";
import type {
  JoinCollectionRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import {
  createEntityRelationHooks,
  type EntityRelationHooks,
  type RelationServicesDeps,
} from "@repo/entity-relations";

type GenericRecord = { readonly id: string; readonly tenantId: string };

interface RelationRuntimeContext {
  readonly deps: RelationServicesDeps;
  readonly hooksFor: (entityName: string) => EntityRelationHooks | undefined;
}

export function createRelationRuntimeContext(
  repositories: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >,
  joinRepository?: JoinCollectionRepository,
): RelationRuntimeContext {
  const deps: RelationServicesDeps = {
    getEntityDefinition: (name) =>
      getAllEntities().find((entity) => entity.name === name),
    getAllEntityDefinitions: () => getAllEntities(),
    findById: async (entityName, id, tenantId) => {
      const repository = repositories[entityName];
      if (!repository) return null;
      const record = await repository.findById(id, tenantId);
      return record ? { id: record.id, tenantId: record.tenantId } : null;
    },
    findByField: async (entityName, field, value, tenantId) => {
      const repository = repositories[entityName];
      if (!repository) return [];
      const result = await repository.findByField({
        tenantId,
        field,
        value,
        limit: 100,
      });
      return result.items.map((record) => ({
        id: record.id,
        tenantId: record.tenantId,
      }));
    },
    update: async (entityName, id, tenantId, data) => {
      const repository = repositories[entityName];
      if (!repository) return null;
      const updated = await repository.update(id, tenantId, data);
      return updated ? { id: updated.id, tenantId: updated.tenantId } : null;
    },
    delete: async (entityName, id, tenantId) => {
      const repository = repositories[entityName];
      if (!repository) return false;
      return repository.delete(id, tenantId);
    },
    joinRepository,
  };

  const hooksByEntityName = new Map<string, EntityRelationHooks>();
  for (const entity of getAllEntities()) {
    hooksByEntityName.set(entity.name, createEntityRelationHooks(entity, deps));
  }

  return {
    deps,
    hooksFor(entityName) {
      return hooksByEntityName.get(entityName);
    },
  };
}
