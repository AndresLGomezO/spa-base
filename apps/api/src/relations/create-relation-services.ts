import {
  getAllEntities,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
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
type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

interface TenantEntityResolver {
  getEntityDefinition(
    name: string,
    tenantId: string,
  ): AnyDefinedEntity | undefined;
  getAllEntityDefinitions(tenantId: string): readonly AnyDefinedEntity[];
  getRepository(
    tenantId: string,
    entityName: string,
  ): TenantScopedEntityRepository<GenericRecord, unknown> | undefined;
}

interface RelationRuntimeContext {
  readonly hooksFor: (entityName: string) => EntityRelationHooks | undefined;
}

function createRelationDeps(
  resolver: TenantEntityResolver,
  repositories: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >,
  tenantId: string,
  joinRepository?: JoinCollectionRepository,
): RelationServicesDeps {
  return {
    getEntityDefinition: (name) => resolver.getEntityDefinition(name, tenantId),
    getAllEntityDefinitions: () => resolver.getAllEntityDefinitions(tenantId),
    findById: async (entityName, id, activeTenantId) => {
      const repository =
        resolver.getRepository(activeTenantId, entityName) ??
        repositories[entityName];
      if (!repository) return null;
      const record = await repository.findById(id, activeTenantId);
      return record ? { id: record.id, tenantId: record.tenantId } : null;
    },
    findByField: async (entityName, field, value, activeTenantId) => {
      const repository =
        resolver.getRepository(activeTenantId, entityName) ??
        repositories[entityName];
      if (!repository) return [];
      const result = await repository.findByField({
        tenantId: activeTenantId,
        field,
        value,
        limit: 100,
      });
      return result.items.map((record) => ({
        id: record.id,
        tenantId: record.tenantId,
      }));
    },
    update: async (entityName, id, activeTenantId, data) => {
      const repository =
        resolver.getRepository(activeTenantId, entityName) ??
        repositories[entityName];
      if (!repository) return null;
      const updated = await repository.update(id, activeTenantId, data);
      return updated ? { id: updated.id, tenantId: updated.tenantId } : null;
    },
    delete: async (entityName, id, activeTenantId) => {
      const repository =
        resolver.getRepository(activeTenantId, entityName) ??
        repositories[entityName];
      if (!repository) return false;
      return repository.delete(id, activeTenantId);
    },
    joinRepository,
  };
}

export function createRelationRuntimeContext(
  resolver: TenantEntityResolver,
  repositories: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >,
  joinRepository?: JoinCollectionRepository,
): RelationRuntimeContext {
  const staticHooks = new Map<string, EntityRelationHooks>();

  for (const entity of getAllEntities()) {
    staticHooks.set(
      entity.name,
      createEntityRelationHooks(
        entity,
        createRelationDeps(resolver, repositories, "", joinRepository),
      ),
    );
  }

  return {
    hooksFor: (entityName) => ({
      validateWrite: async (record, mode) => {
        const tenantId =
          typeof record.tenantId === "string" ? record.tenantId : "";
        const entity = resolver.getEntityDefinition(entityName, tenantId);
        if (!entity) {
          return;
        }
        const hooks = createEntityRelationHooks(
          entity,
          createRelationDeps(resolver, repositories, tenantId, joinRepository),
        );
        return hooks.validateWrite(record, mode);
      },
      beforeDelete: async (id, tenantId) => {
        const entity = resolver.getEntityDefinition(entityName, tenantId);
        if (!entity) {
          return;
        }
        const hooks = createEntityRelationHooks(
          entity,
          createRelationDeps(resolver, repositories, tenantId, joinRepository),
        );
        return hooks.beforeDelete(id, tenantId);
      },
    }),
  };
}
