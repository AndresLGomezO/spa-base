import {
  getAllEntities,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import {
  registerDynamicEntity,
  resolveEntity as resolveDynamicEntity,
} from "@repo/dynamic-entities";
import type {
  EntityDefinitionRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import { createEntityConverter } from "@repo/firestore-converters";
import {
  createFirestoreAdminEntityRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;
type GenericRecord = { readonly id: string; readonly tenantId: string };

export interface WorkerEntityRuntimeForCrudHooks {
  resolveEntity(name: string, tenantId: string): AnyDefinedEntity | undefined;
  getRepository(
    tenantId: string,
    entityName: string,
  ): TenantScopedEntityRepository<GenericRecord, unknown> | undefined;
}

export class WorkerHookEntityRuntime implements WorkerEntityRuntimeForCrudHooks {
  private readonly loadedTenants = new Set<string>();
  private readonly repositoryCache = new Map<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >();

  constructor(
    private readonly firebaseAdminConfig: FirebaseAdminConfig,
    private readonly entityDefinitionRepository: EntityDefinitionRepository,
  ) {}

  async ensureTenantEntitiesLoaded(tenantId: string): Promise<void> {
    if (this.loadedTenants.has(tenantId)) {
      return;
    }

    const records = await this.entityDefinitionRepository.list(tenantId);
    for (const record of records) {
      registerDynamicEntity(tenantId, record);
    }
    this.loadedTenants.add(tenantId);
  }

  resolveEntity(name: string, tenantId: string): AnyDefinedEntity | undefined {
    const dynamic = resolveDynamicEntity(name, tenantId);
    if (dynamic) {
      return dynamic;
    }

    for (const entity of getAllEntities()) {
      if (entity.name === name) {
        return entity;
      }
    }

    return undefined;
  }

  getRepository(
    tenantId: string,
    entityName: string,
  ): TenantScopedEntityRepository<GenericRecord, unknown> | undefined {
    const staticKey = `static:${entityName}`;
    const cachedStatic = this.repositoryCache.get(staticKey);
    if (cachedStatic) {
      return cachedStatic;
    }

    const tenantKey = `${tenantId}:${entityName}`;
    const cachedTenant = this.repositoryCache.get(tenantKey);
    if (cachedTenant) {
      return cachedTenant;
    }

    const entity = this.resolveEntity(entityName, tenantId);
    if (!entity) {
      return undefined;
    }

    const converter = createEntityConverter(entity);
    const repository = createFirestoreAdminEntityRepository({
      config: this.firebaseAdminConfig,
      collection: entity.metadata.collection,
      converter,
    });

    const key = resolveDynamicEntity(entityName, tenantId)
      ? tenantKey
      : staticKey;
    this.repositoryCache.set(key, repository);
    return repository;
  }
}
