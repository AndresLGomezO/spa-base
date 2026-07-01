import {
  getAllEntities,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import { AI_PERMISSIONS } from "@repo/ai-engine/permissions";
import {
  getDynamicPermissionsForTenant,
  getEntitiesForTenant,
  registerDynamicEntity,
  resolveEntity,
  clearDynamicEntitiesForTenant,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import { HOOK_PERMISSIONS } from "@repo/hooks";
import { ENTITY_QUERY_PERMISSIONS } from "@repo/entity-queries/permissions";
import { CUSTOM_VIEW_PERMISSIONS } from "@repo/custom-views/permissions";
import { METRIC_PERMISSIONS } from "@repo/metrics-engine";
import { ROLE_PERMISSIONS, TENANT_USER_PERMISSIONS } from "@repo/rbac";
import type {
  EntityDefinitionRepository,
  EntityQueryExecutor,
  JoinCollectionRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import { createEntityConverter } from "@repo/firestore-converters";
import { indexesForEntity } from "@repo/firestore-indexes";
import {
  buildInMemoryListSnapshotInvalidationPrefix,
  createFirestoreAdminEntityRepository,
  createFirestoreEntityQueryExecutor,
  createInMemoryListSnapshotCache,
  scheduleEnsureEntityFirestoreIndexes,
  scheduleEnsureFirestoreIndexesFromHint,
  scheduleReconcileIndexesForDefinitionChange,
  type FirestoreCompositeIndex,
  type FirestoreIndexHint,
  type FirestoreIndexStatusStore,
  type FirebaseAdminConfig,
  type InMemoryListSnapshotCache,
} from "@repo/gcp-firebase";
import type { RbacQueryInjector } from "@repo/query-engine";

import { buildConverterEncryptionConfig } from "../crud/sensitive-fields.js";
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
  readonly ensureFirestoreIndexes?: boolean;
  readonly indexProvisioningExcludedTenants?: ReadonlySet<string>;
  readonly indexStatusStore?: FirestoreIndexStatusStore;
  readonly onIndexHint?: (hint: FirestoreIndexHint) => void;
  readonly onIndexEnsured?: (index: FirestoreCompositeIndex) => void;
  readonly onIndexEnsureError?: (
    error: unknown,
    index: FirestoreCompositeIndex,
  ) => void;
  readonly cursorSecret?: string;
  readonly clientFallbackMaxDocs?: number;
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
  private readonly inMemoryRecordStores = new Map<
    string,
    Map<string, GenericRecord>
  >();
  private readonly definitionsLoadedAt = new Map<string, number>();
  private readonly definitionCacheTtlMs: number;
  private readonly inMemoryListSnapshotCache: InMemoryListSnapshotCache;

  constructor(private readonly options: EntityRuntimeContextOptions) {
    this.definitionCacheTtlMs = options.definitionCacheTtlMs ?? 60_000;
    this.inMemoryListSnapshotCache = createInMemoryListSnapshotCache({
      ttlMs: this.definitionCacheTtlMs,
    });
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
        "entityUiOverride.read",
        "entityUiOverride.update",
        "internalEntity.read",
        "entityCategory.read",
        "entityCategory.create",
        "entityCategory.update",
        ...HOOK_PERMISSIONS,
        ...METRIC_PERMISSIONS,
        ...ENTITY_QUERY_PERMISSIONS,
        ...CUSTOM_VIEW_PERMISSIONS,
        ...AI_PERMISSIONS,
        ...ROLE_PERMISSIONS,
        ...TENANT_USER_PERMISSIONS,
      ]),
    ];
  }

  private cacheKey(tenantId: string, entityName: string): string {
    return `${tenantId}:${entityName}`;
  }

  invalidateEntityRuntime(tenantId: string, entityName: string): void {
    const key = this.cacheKey(tenantId, entityName);
    this.repositoryCache.delete(key);
    this.queryExecutorCache.delete(key);
  }

  private invalidateTenantRuntime(tenantId: string): void {
    const prefix = `${tenantId}:`;
    for (const key of this.repositoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.repositoryCache.delete(key);
      }
    }
    for (const key of this.queryExecutorCache.keys()) {
      if (key.startsWith(prefix)) {
        this.queryExecutorCache.delete(key);
      }
    }
  }

  private getInMemoryRecordStore(key: string): Map<string, GenericRecord> {
    const existing = this.inMemoryRecordStores.get(key);
    if (existing) {
      return existing;
    }
    const store = new Map<string, GenericRecord>();
    this.inMemoryRecordStores.set(key, store);
    return store;
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

    const encryption = buildConverterEncryptionConfig(
      entity.metadata.fields,
      tenantId,
    );

    const repository = this.options.repositories
      ? createInMemoryEntityRepository<GenericRecord>({
          store: this.getInMemoryRecordStore(key),
        })
      : createFirestoreAdminEntityRepository({
          config: this.options.firebaseAdminConfig,
          collection: entity.metadata.collection,
          converter:
            getEntityConverter(entity.name) ??
            createEntityConverter(entity, encryption),
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

    const encryption = buildConverterEncryptionConfig(
      entity.metadata.fields,
      tenantId,
    );

    const executor = this.options.repositories
      ? createInMemoryEntityQueryExecutor(
          () =>
            this.getInMemoryRecordStore(key) as Map<
              string,
              Record<string, unknown>
            >,
        )
      : createFirestoreEntityQueryExecutor({
          config: this.options.firebaseAdminConfig,
          collection: entity.metadata.collection,
          converter:
            getEntityConverter(entity.name) ??
            createEntityConverter(entity, encryption),
          onIndexHint: this.options.onIndexHint,
          cursorSecret: this.options.cursorSecret,
          plannedIndexes: indexesForEntity(entity),
          tenantWideRead: entity.metadata.tenantWideRead === true,
          inMemoryListQueries: entity.metadata.inMemoryListQueries === true,
          clientFallbackMaxDocs: this.options.clientFallbackMaxDocs ?? 0,
          inMemoryListSnapshotCache: entity.metadata.inMemoryListQueries
            ? this.inMemoryListSnapshotCache
            : undefined,
        });
    this.queryExecutorCache.set(key, executor);
    return executor;
  }

  createQueryContext(
    rbacQueryInjector?: RbacQueryInjector,
  ): ReturnType<typeof createQueryRuntimeContext> {
    const executorsByEntityName: Record<string, EntityQueryExecutor> = {
      ...(this.options.queryExecutors ?? {}),
    };
    return createQueryRuntimeContext(
      this,
      executorsByEntityName,
      rbacQueryInjector,
    );
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

  private getIndexEnsureOptions():
    | Parameters<typeof scheduleEnsureEntityFirestoreIndexes>[1]
    | null {
    if (!this.options.ensureFirestoreIndexes || this.options.repositories) {
      return null;
    }
    return {
      projectId: this.options.firebaseAdminConfig.projectId,
      ...(this.options.indexStatusStore
        ? { statusStore: this.options.indexStatusStore }
        : {}),
      ...(this.options.onIndexEnsured
        ? { onEnsured: this.options.onIndexEnsured }
        : {}),
      ...(this.options.onIndexEnsureError
        ? { onError: this.options.onIndexEnsureError }
        : {}),
    };
  }

  getIndexStatusStore(): FirestoreIndexStatusStore | undefined {
    return this.options.indexStatusStore;
  }

  ensureIndexesForEntity(entity: AnyDefinedEntity, tenantId?: string): void {
    if (tenantId && this.isIndexProvisioningExcluded(tenantId)) {
      return;
    }

    const ensureOptions = this.getIndexEnsureOptions();
    if (!ensureOptions) {
      return;
    }
    scheduleEnsureEntityFirestoreIndexes(entity, ensureOptions);
  }

  ensureIndexesFromHint(hint: FirestoreIndexHint): void {
    if (this.isIndexProvisioningExcluded(hint.tenantId)) {
      return;
    }

    const ensureOptions = this.getIndexEnsureOptions();
    if (!ensureOptions) {
      return;
    }
    scheduleEnsureFirestoreIndexesFromHint(hint, ensureOptions);
  }

  ensureCatalogIndexes(tenantId: string): void {
    if (this.isIndexProvisioningExcluded(tenantId)) {
      return;
    }

    for (const entity of this.getEntitiesForTenant(tenantId)) {
      this.ensureIndexesForEntity(entity, tenantId);
    }
  }

  async syncDefinition(
    record: EntityDefinitionRecord,
    previousRecord?: EntityDefinitionRecord,
  ): Promise<void> {
    const entity = registerDynamicEntity(record.tenantId, record);
    this.invalidateEntityRuntime(record.tenantId, record.name);
    this.inMemoryListSnapshotCache.invalidateByPrefix(
      buildInMemoryListSnapshotInvalidationPrefix(
        record.tenantId,
        entity.metadata.collection,
      ),
    );
    this.definitionsLoadedAt.set(record.tenantId, Date.now());
    this.ensureIndexesForEntity(entity, record.tenantId);

    if (previousRecord && !this.isIndexProvisioningExcluded(record.tenantId)) {
      const reconcileOptions = this.getReconcileOptions();
      if (reconcileOptions) {
        scheduleReconcileIndexesForDefinitionChange(
          previousRecord,
          record,
          reconcileOptions,
        );
      }
    }
  }

  private getReconcileOptions():
    | Parameters<typeof scheduleReconcileIndexesForDefinitionChange>[2]
    | null {
    const ensureOptions = this.getIndexEnsureOptions();
    if (!ensureOptions) {
      return null;
    }
    return {
      ...ensureOptions,
      firebaseAdminConfig: this.options.firebaseAdminConfig,
      repository: this.options.entityDefinitionRepository,
      statusStore: this.options.indexStatusStore,
    };
  }

  invalidateTenantDefinitions(tenantId: string): void {
    clearDynamicEntitiesForTenant(tenantId);
    this.invalidateTenantRuntime(tenantId);
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
    this.invalidateTenantRuntime(parsedTenantId);
    const records =
      await this.options.entityDefinitionRepository.list(parsedTenantId);
    for (const record of records) {
      registerDynamicEntity(parsedTenantId, record);
    }
    this.definitionsLoadedAt.set(parsedTenantId, now);
  }

  private isIndexProvisioningExcluded(tenantId: string): boolean {
    return (
      this.options.indexProvisioningExcludedTenants?.has(tenantId) ?? false
    );
  }
}

export function createEntityRuntimeContext(
  options: EntityRuntimeContextOptions,
): EntityRuntimeContext {
  return new EntityRuntimeContext(options);
}
