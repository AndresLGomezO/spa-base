import {
  defineEntityFromRecord,
  registerDynamicEntity,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import { createEntityConverter } from "@repo/firestore-converters";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";
import { applySearchMirrorFields } from "@repo/entities";
import {
  createFirestoreAdminEntityRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

type GenericRecord = { readonly id: string; readonly tenantId: string };

import type { EntityRuntimeForCrudHooks } from "../../hooks/crud-hook-deps.types.js";

function buildSeedRecord(
  tenantId: string,
  business: Record<string, unknown>,
  id: string,
  ownerId: string,
  now: string,
): Record<string, unknown> {
  return {
    ...business,
    id,
    tenantId,
    createdAt: now,
    updatedAt: now,
    ownerId,
    accessUserIds: [ownerId],
    sharedWith: {},
  };
}

function repositoryCacheKey(tenantId: string, entityName: string): string {
  return `${tenantId}:${entityName}`;
}

function getSeedEntityRepository(
  context: LocalRecordSeedContext,
  entity: DefinedEntity<string, FieldDefinitions>,
): TenantScopedEntityRepository<GenericRecord, unknown> {
  const key = repositoryCacheKey(context.tenantId, entity.name);
  const cached = context.repositoryCache.get(key);
  if (cached) {
    return cached;
  }

  const repository = createFirestoreAdminEntityRepository({
    config: context.config,
    collection: entity.metadata.collection,
    converter: createEntityConverter(entity),
  });
  context.repositoryCache.set(key, repository);
  return repository;
}

function buildParsedSeedRecord(
  context: LocalRecordSeedContext,
  entity: DefinedEntity<string, FieldDefinitions>,
  id: string,
  business: Record<string, unknown>,
  now: string,
): GenericRecord {
  const draft = applySearchMirrorFields(
    entity,
    buildSeedRecord(context.tenantId, business, id, context.ownerId, now),
  );
  return entity.schema.parse(draft) as GenericRecord;
}

export function createSeedHookEntityRuntime(
  context: LocalRecordSeedContext,
): EntityRuntimeForCrudHooks {
  return {
    resolveEntity(entityName, tenantId) {
      if (tenantId !== context.tenantId) {
        return undefined;
      }
      return context.entities.get(entityName);
    },
    getRepository(tenantId, entityName) {
      if (tenantId !== context.tenantId) {
        return undefined;
      }
      const entity = context.entities.get(entityName);
      if (!entity) {
        return undefined;
      }
      return getSeedEntityRepository(context, entity);
    },
  };
}

type LocalRecordSeedContext = {
  readonly tenantId: string;
  readonly config: FirebaseAdminConfig;
  readonly entities: Map<string, DefinedEntity<string, FieldDefinitions>>;
  readonly ownerId: string;
  readonly repositoryCache: Map<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >;
};

export function createLocalRecordSeedContext(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  ownerId: string,
): LocalRecordSeedContext {
  for (const record of definitionRecords) {
    registerDynamicEntity(tenantId, record);
  }

  return {
    tenantId,
    config: firebaseAdminConfig,
    entities: new Map(
      definitionRecords.map((record) => [
        record.name,
        defineEntityFromRecord(record),
      ]),
    ),
    ownerId,
    repositoryCache: new Map(),
  };
}

export async function importLocalRecordsBatch(
  context: LocalRecordSeedContext,
  entityName: string,
  records: readonly {
    readonly id: string;
    readonly business: Record<string, unknown>;
  }[],
): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const entity = context.entities.get(entityName);
  if (!entity) {
    throw new Error(
      `Entity "${entityName}" is not registered for local tenant seed on tenant "${context.tenantId}".`,
    );
  }

  const repository = getSeedEntityRepository(context, entity);
  const now = new Date().toISOString();
  const parsedRecords = records.map(({ id, business }) =>
    buildParsedSeedRecord(context, entity, id, business, now),
  );

  await repository.createMany(context.tenantId, parsedRecords);
}

/**
 * Deletes tenant records. When `ids` is set, only those ids are removed;
 * otherwise every record of the entity is deleted.
 */
export async function deleteLocalRecordsMatching(
  context: LocalRecordSeedContext,
  entityName: string,
  ids?: ReadonlySet<string>,
): Promise<number> {
  const entity = context.entities.get(entityName);
  if (!entity) {
    throw new Error(
      `Entity "${entityName}" is not registered for local tenant seed on tenant "${context.tenantId}".`,
    );
  }

  const repository = getSeedEntityRepository(context, entity);
  const targetIds: string[] = [];

  if (ids && ids.size > 0) {
    targetIds.push(...ids);
  } else {
    let cursor: string | undefined;
    do {
      const page = await repository.findAll({
        tenantId: context.tenantId,
        limit: 200,
        cursor,
      });
      for (const item of page.items) {
        targetIds.push(item.id);
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
  }

  let deleted = 0;
  for (const id of targetIds) {
    const didDelete = await repository.delete(id, context.tenantId);
    if (didDelete) {
      deleted += 1;
    }
  }

  return deleted;
}

/**
 * Deletes tenant records whose ids are not in `keepIds` (e.g. orphan UUID
 * schedules left after Create initial / Roll forward before a deterministic reseed).
 */
export async function deleteLocalRecordsNotInSet(
  context: LocalRecordSeedContext,
  entityName: string,
  keepIds: ReadonlySet<string>,
): Promise<number> {
  const entity = context.entities.get(entityName);
  if (!entity) {
    throw new Error(
      `Entity "${entityName}" is not registered for local tenant seed on tenant "${context.tenantId}".`,
    );
  }

  const repository = getSeedEntityRepository(context, entity);
  const orphanIds: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await repository.findAll({
      tenantId: context.tenantId,
      limit: 200,
      cursor,
    });

    for (const item of page.items) {
      if (!keepIds.has(item.id)) {
        orphanIds.push(item.id);
      }
    }

    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  let deleted = 0;
  for (const id of orphanIds) {
    const didDelete = await repository.delete(id, context.tenantId);
    if (didDelete) {
      deleted += 1;
    }
  }

  return deleted;
}
