import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import { getAllEntities, prepareRecordSearchFields } from "@repo/entities";
import type { QueryEngine } from "@repo/query-engine";

import { registerCrudRoutes } from "../crud/register-crud-routes.js";
import type { CrudHookDeps } from "../hooks/crud-hook-deps.types.js";
import { createParametricEntityPermissionGuards } from "../rbac/create-entity-permission-guards.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { createRelationRuntimeContext } from "../relations/create-relation-services.js";
import type {
  FirebaseAdminConfig,
  FirestoreIndexStatusStore,
} from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "./entity-runtime-context.js";
import { sanitizeFileFieldsForWrite } from "../entity-files/entity-file-field-utils.js";
import type { RecordReadEnricher } from "../entity-files/create-entity-file-read-enricher.js";
import type { AggregationEmitterDeps } from "../aggregation/emit-aggregation-event.js";

const registeredContexts = new WeakMap<EntityRuntimeContext, boolean>();
const staticEntityNames = new Set(
  getAllEntities().map((entity) => entity.name),
);

export async function registerDynamicEntityCrudRoutes(
  entityRuntime: EntityRuntimeContext,
  server: FastifyInstance,
  authenticate: preHandlerAsyncHookHandler,
  permissionDeps: LoadRequestPermissionsDeps,
  queryEngine: QueryEngine,
  relationContext: ReturnType<typeof createRelationRuntimeContext>,
  crudHooks?: CrudHookDeps,
  indexStatusStore?: FirestoreIndexStatusStore,
  recordReadEnricher?: RecordReadEnricher,
  firebaseAdminConfig?: FirebaseAdminConfig,
  aggregation?: AggregationEmitterDeps,
): Promise<void> {
  if (registeredContexts.get(entityRuntime)) {
    return;
  }

  await registerCrudRoutes(server, {
    parametricEntityName: true,
    entityName: "entityName",
    entity: (tenantId, entityName) => {
      if (!entityName || staticEntityNames.has(entityName)) {
        return null;
      }
      const entity = entityRuntime.resolveEntity(entityName, tenantId);
      if (!entity) {
        return null;
      }
      return {
        name: entity.name,
        collection: entity.metadata.collection,
        schema: entity.schema,
        createSchema: entity.createSchema,
        updateSchema: entity.updateSchema,
        businessFieldNames: Object.keys(entity.metadata.fields),
        prepareRecordForWrite: (record) =>
          sanitizeFileFieldsForWrite(
            entity,
            prepareRecordSearchFields(entity, record),
          ),
      };
    },
    repository: (tenantId, entityName) => {
      if (!entityName || staticEntityNames.has(entityName)) {
        return null;
      }
      return entityRuntime.getRepository(tenantId, entityName) ?? null;
    },
    authenticate,
    authorize: createParametricEntityPermissionGuards(permissionDeps),
    relations: (entityName) => relationContext.hooksFor(entityName),
    queryEngine,
    indexStatusStore,
    referencePopulator: {
      getEntityDefinition: (name, tenantId) =>
        entityRuntime.getEntityDefinition(name, tenantId),
      getRepository: (tenantId, entityName) =>
        entityRuntime.getRepository(tenantId, entityName),
      ...(firebaseAdminConfig ? { firebaseAdminConfig } : {}),
    },
    ...(crudHooks ? { crudHooks } : {}),
    ...(recordReadEnricher ? { recordReadEnricher } : {}),
    ...(aggregation ? { aggregation } : {}),
    onRecordMutated: (tenantId, entityName) => {
      entityRuntime.invalidateInMemoryListSnapshot(tenantId, entityName);
    },
  });

  registeredContexts.set(entityRuntime, true);
}
