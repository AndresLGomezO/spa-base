import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import { getAllEntities } from "@repo/entities";
import type { QueryEngine } from "@repo/query-engine";

import { registerCrudRoutes } from "../crud/register-crud-routes.js";
import type { CrudHookDeps } from "../hooks/crud-hook-deps.types.js";
import { createParametricEntityPermissionGuards } from "../rbac/create-entity-permission-guards.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { createRelationRuntimeContext } from "../relations/create-relation-services.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

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
        schema: entity.schema,
        createSchema: entity.createSchema,
        updateSchema: entity.updateSchema,
        businessFieldNames: Object.keys(entity.metadata.fields),
        metadata: entity.metadata,
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
    ...(crudHooks ? { crudHooks } : {}),
  });

  registeredContexts.set(entityRuntime, true);
}
