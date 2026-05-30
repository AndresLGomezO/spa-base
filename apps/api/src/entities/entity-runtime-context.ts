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
  clearDynamicEntitiesForTenant,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import { HOOK_PERMISSIONS } from "@repo/hooks";
import { ROLE_PERMISSIONS, TENANT_USER_PERMISSIONS } from "@repo/rbac";
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
  type FirestoreIndexHint,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { createInMemoryEntityQueryExecutor } from "../repositories/in-memory-entity-query-executor.js";
import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { createQueryRuntimeContext } from "../query/create-query-services.js";
import { createRelationRuntimeContext } from "../relations/create-relation-services.js";
import { getEntityConverter } from "./entity-converter-registry.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;
type GenericRecord = { readonly id: string; readonly tenantId: string };

interface EntityRuntimeContextOptions {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly entityDefinitionRepository: EntityDefinitionRepository;
  readonly definitionCacheTtlMs?: number;
  readonly onIndexHint?: (hint: FirestoreIndexHint) => void;
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
  private readonly definitionsLoadedAt = new Map<string, number>();
  private readonly definitionCacheTtlMs: number;

  constructor(private readonly options: EntityRuntimeContextOptions) {
    this.definitionCacheTtlMs = options.definitionCacheTtlMs ?? 60_000;
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
        ...HOOK_PERMISSIONS,
        ...ROLE_PERMISSIONS,
        ...TENANT_USER_PERMISSIONS,
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
          onIndexHint: this.options.onIndexHint,
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
    this.definitionsLoadedAt.set(record.tenantId, Date.now());
  }

  invalidateTenantDefinitions(tenantId: string): void {
    clearDynamicEntitiesForTenant(tenantId);
    this.definitionsLoadedAt.delete(tenantId);
  }

  async loadTenantDefinitions(
    tenantId: string,
    options?: { readonly force?: boolean },
  ): Promise<void> {
    const parsedTenantId = tenantId.trim();
    if (parsedTenantId.length === 0) {
      return;
    }

    const now = Date.now();
    const loadedAt = this.definitionsLoadedAt.get(parsedTenantId);
    if (
      !options?.force &&
      loadedAt !== undefined &&
      now - loadedAt < this.definitionCacheTtlMs
    ) {
      return;
    }

    clearDynamicEntitiesForTenant(parsedTenantId);
    const records =
      await this.options.entityDefinitionRepository.list(parsedTenantId);
    for (const record of records) {
      registerDynamicEntity(parsedTenantId, record);
    }
    this.definitionsLoadedAt.set(parsedTenantId, now);
  }
}

export function createEntityRuntimeContext(
  options: EntityRuntimeContextOptions,
): EntityRuntimeContext {
  return new EntityRuntimeContext(options);
}
