import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import {
  getAllEntities,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import {
  getDynamicPermissionsForTenant,
  getEntitiesForTenant,
  registerDynamicEntity,
  resolveEntity,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import type {
  EntityDefinitionRepository,
  EntityQueryExecutor,
  JoinCollectionRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import { createEntityConverter } from "@repo/firestore-converters";
import {
  createFirestoreAdminEntityRepository,
  createFirestoreEntityQueryExecutor,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import type { QueryEngine } from "@repo/query-engine";

import { registerCrudRoutes } from "../crud/register-crud-routes.js";
import { createInMemoryEntityQueryExecutor } from "../repositories/in-memory-entity-query-executor.js";
import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { createParametricEntityPermissionGuards } from "../rbac/create-entity-permission-guards.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import { createQueryRuntimeContext } from "../query/create-query-services.js";
import { createRelationRuntimeContext } from "../relations/create-relation-services.js";
import { getEntityConverter } from "./entity-converter-registry.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;
type GenericRecord = { readonly id: string; readonly tenantId: string };

interface EntityRuntimeContextOptions {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly entityDefinitionRepository: EntityDefinitionRepository;
  readonly repositories?: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >;
  readonly queryExecutors?: Record<string, EntityQueryExecutor>;
}

export class EntityRuntimeContext {
  private readonly repositoryCache = new Map<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >();
  private readonly queryExecutorCache = new Map<string, EntityQueryExecutor>();
  private readonly registeredRouteNames = new Set<string>();
  private dynamicCrudRoutesRegistered = false;
  private readonly staticEntityNames: ReadonlySet<string>;

  constructor(private readonly options: EntityRuntimeContextOptions) {
    this.staticEntityNames = new Set(
      getAllEntities().map((entity) => entity.name),
    );
    for (const [entityName, repository] of Object.entries(
      options.repositories ?? {},
    )) {
      this.repositoryCache.set(`static:${entityName}`, repository);
    }
    for (const [entityName, executor] of Object.entries(
      options.queryExecutors ?? {},
    )) {
      this.queryExecutorCache.set(`static:${entityName}`, executor);
    }
  }

  get entityDefinitionRepository(): EntityDefinitionRepository {
    return this.options.entityDefinitionRepository;
  }

  resolveEntity(name: string, tenantId: string): AnyDefinedEntity | undefined {
    return resolveEntity(name, tenantId);
  }

  getEntitiesForTenant(tenantId: string): readonly AnyDefinedEntity[] {
    return getEntitiesForTenant(tenantId);
  }

  getKnownPermissions(tenantId: string): readonly string[] {
    return [
      ...new Set([
        ...getAllEntities().flatMap((entity) => entity.metadata.permissions),
        ...getDynamicPermissionsForTenant(tenantId),
        "entityDefinition.read",
        "entityDefinition.create",
        "entityDefinition.update",
      ]),
    ];
  }

  private cacheKey(tenantId: string, entityName: string): string {
    return `${tenantId}:${entityName}`;
  }

  getRepository(
    tenantId: string,
    entityName: string,
  ): TenantScopedEntityRepository<GenericRecord, unknown> | undefined {
    const staticRepo = this.repositoryCache.get(`static:${entityName}`);
    if (staticRepo) {
      return staticRepo;
    }

    const key = this.cacheKey(tenantId, entityName);
    const cached = this.repositoryCache.get(key);
    if (cached) {
      return cached;
    }

    const entity = this.resolveEntity(entityName, tenantId);
    if (!entity) {
      return undefined;
    }

    const repository = this.options.repositories
      ? createInMemoryEntityRepository<GenericRecord>()
      : createFirestoreAdminEntityRepository({
          config: this.options.firebaseAdminConfig,
          collection: entity.metadata.collection,
          converter:
            getEntityConverter(entity.name) ?? createEntityConverter(entity),
        });
    this.repositoryCache.set(key, repository);
    return repository;
  }

  getQueryExecutor(
    tenantId: string,
    entityName: string,
  ): EntityQueryExecutor | undefined {
    const staticExecutor = this.queryExecutorCache.get(`static:${entityName}`);
    if (staticExecutor) {
      return staticExecutor;
    }

    const key = this.cacheKey(tenantId, entityName);
    const cached = this.queryExecutorCache.get(key);
    if (cached) {
      return cached;
    }

    const entity = this.resolveEntity(entityName, tenantId);
    if (!entity) {
      return undefined;
    }

    const executor = this.options.repositories
      ? createInMemoryEntityQueryExecutor(() => new Map())
      : createFirestoreEntityQueryExecutor({
          config: this.options.firebaseAdminConfig,
          collection: entity.metadata.collection,
          converter:
            getEntityConverter(entity.name) ?? createEntityConverter(entity),
        });
    this.queryExecutorCache.set(key, executor);
    return executor;
  }

  createQueryContext(): ReturnType<typeof createQueryRuntimeContext> {
    const executorsByEntityName: Record<string, EntityQueryExecutor> = {
      ...(this.options.queryExecutors ?? {}),
    };
    return createQueryRuntimeContext(this, executorsByEntityName);
  }

  createRelationContext(
    joinRepository?: JoinCollectionRepository,
  ): ReturnType<typeof createRelationRuntimeContext> {
    const repositories: Record<
      string,
      TenantScopedEntityRepository<GenericRecord, unknown>
    > = { ...(this.options.repositories ?? {}) };
    return createRelationRuntimeContext(this, repositories, joinRepository);
  }

  getEntityDefinition(
    name: string,
    tenantId: string,
  ): AnyDefinedEntity | undefined {
    return this.resolveEntity(name, tenantId);
  }

  getAllEntityDefinitions(tenantId: string): readonly AnyDefinedEntity[] {
    return this.getEntitiesForTenant(tenantId);
  }

  async syncDefinition(record: EntityDefinitionRecord): Promise<void> {
    registerDynamicEntity(record.tenantId, record);
  }

  async loadTenantDefinitions(tenantId: string): Promise<void> {
    const records =
      await this.options.entityDefinitionRepository.list(tenantId);
    for (const record of records) {
      registerDynamicEntity(tenantId, record);
    }
  }

  async registerDynamicEntityCrudRoutes(
    server: FastifyInstance,
    authenticate: preHandlerAsyncHookHandler,
    permissionDeps: LoadRequestPermissionsDeps,
    queryEngine: QueryEngine,
    relationContext: ReturnType<
      typeof import("../relations/create-relation-services.js").createRelationRuntimeContext
    >,
  ): Promise<void> {
    if (this.dynamicCrudRoutesRegistered) {
      return;
    }

    await registerCrudRoutes(server, {
      parametricEntityName: true,
      entityName: "entityName",
      entity: (tenantId, entityName) => {
        if (!entityName || this.staticEntityNames.has(entityName)) {
          return null;
        }
        const entity = this.resolveEntity(entityName, tenantId);
        if (!entity) {
          return null;
        }
        return {
          name: entity.name,
          schema: entity.schema,
          createSchema: entity.createSchema,
          updateSchema: entity.updateSchema,
        };
      },
      repository: (tenantId, entityName) => {
        if (!entityName || this.staticEntityNames.has(entityName)) {
          return null;
        }
        return this.getRepository(tenantId, entityName) ?? null;
      },
      authenticate,
      authorize: createParametricEntityPermissionGuards(permissionDeps),
      relations: (entityName) => relationContext.hooksFor(entityName),
      queryEngine,
    });

    this.dynamicCrudRoutesRegistered = true;
  }

  async ensureDynamicCrudRoutesRegistered(
    server: FastifyInstance,
    entityName: string,
    authenticate: preHandlerAsyncHookHandler,
    permissionDeps: LoadRequestPermissionsDeps,
    queryEngine: QueryEngine,
    relationContext: ReturnType<
      typeof import("../relations/create-relation-services.js").createRelationRuntimeContext
    >,
  ): Promise<void> {
    await this.registerDynamicEntityCrudRoutes(
      server,
      authenticate,
      permissionDeps,
      queryEngine,
      relationContext,
    );
    this.registeredRouteNames.add(entityName);
  }
}

export function createEntityRuntimeContext(
  options: EntityRuntimeContextOptions,
): EntityRuntimeContext {
  return new EntityRuntimeContext(options);
}
