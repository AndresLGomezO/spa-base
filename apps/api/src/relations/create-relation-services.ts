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
  createJoinCollectionHandler,
  type EntityRelationHooks,
  type RelationServicesDeps,
} from "@repo/entity-relations";

type GenericRecord = { readonly id: string; readonly tenantId: string };
type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

type RelationChildMutatedHandler = NonNullable<
  RelationServicesDeps["onChildRecordMutated"]
>;

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
  readonly joinHandlerFor: (
    tenantId: string,
  ) => ReturnType<typeof createJoinCollectionHandler>;
}

function createRelationDeps(
  resolver: TenantEntityResolver,
  repositories: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >,
  tenantId: string,
  joinRepository?: JoinCollectionRepository,
  onChildRecordMutated?: RelationChildMutatedHandler,
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
      return record
        ? ({ ...(record as Record<string, unknown>) } as GenericRecord)
        : null;
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
      return result.items.map(
        (record) =>
          ({ ...(record as Record<string, unknown>) }) as GenericRecord,
      );
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
    ...(onChildRecordMutated ? { onChildRecordMutated } : {}),
  };
}

export function createRelationRuntimeContext(
  resolver: TenantEntityResolver,
  repositories: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >,
  joinRepository?: JoinCollectionRepository,
  onChildRecordMutated?: RelationChildMutatedHandler,
): RelationRuntimeContext {
  const staticHooks = new Map<string, EntityRelationHooks>();

  for (const entity of getAllEntities()) {
    staticHooks.set(
      entity.name,
      createEntityRelationHooks(
        entity,
        createRelationDeps(
          resolver,
          repositories,
          "",
          joinRepository,
          onChildRecordMutated,
        ),
      ),
    );
  }

  return {
    hooksFor: (entityName) => ({
      validateWrite: async (record, mode, userId) => {
        const tenantId =
          typeof record.tenantId === "string" ? record.tenantId : "";
        const entity = resolver.getEntityDefinition(entityName, tenantId);
        if (!entity) {
          return;
        }
        const hooks = createEntityRelationHooks(
          entity,
          createRelationDeps(
            resolver,
            repositories,
            tenantId,
            joinRepository,
            onChildRecordMutated,
          ),
        );
        return hooks.validateWrite(record, mode, userId);
      },
      beforeDelete: async (id, tenantId, userId) => {
        const entity = resolver.getEntityDefinition(entityName, tenantId);
        if (!entity) {
          return;
        }
        const hooks = createEntityRelationHooks(
          entity,
          createRelationDeps(
            resolver,
            repositories,
            tenantId,
            joinRepository,
            onChildRecordMutated,
          ),
        );
        return hooks.beforeDelete(id, tenantId, userId);
      },
    }),
    joinHandlerFor: (tenantId) =>
      createJoinCollectionHandler(
        createRelationDeps(
          resolver,
          repositories,
          tenantId,
          joinRepository,
          onChildRecordMutated,
        ),
      ),
  };
}
