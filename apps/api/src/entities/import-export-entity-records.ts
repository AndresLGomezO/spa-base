import type { FastifyInstance, FastifyRequest } from "fastify";
import { RelationError } from "@repo/entity-relations";
import {
  createEntityRecordsExportEnvelope,
  getForeignKeyRelationFields,
  getJoinCollectionRelations,
  normalizeEntityRecordsImportInput,
  prepareRecordSearchFields,
  resolveJoinCollectionName,
  toPortableEntityRecord,
  validateEntityRecordsImport,
  type DefinedEntity,
  type EntityRecordJsonError,
  type FieldDefinitions,
  type PortableEntityRecord,
} from "@repo/entities";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";
import type { QueryContext, QueryEngine } from "@repo/query-engine";
import { nanoid } from "nanoid";

import { checkRecordAccess } from "../access/record-access.js";
import { emitAggregationEventIfNeeded } from "../aggregation/emit-aggregation-event.js";
import type { AggregationEmitterDeps } from "../aggregation/emit-aggregation-event.js";
import { sanitizeFileFieldsForWrite } from "../entity-files/entity-file-field-utils.js";
import type { CrudHookDeps } from "../hooks/crud-hook-deps.types.js";
import { resolveCrudHookEntityServices } from "../hooks/crud-hook-deps.js";
import { buildCrudHookRunParams } from "../hooks/build-crud-hook-run-params.js";
import { runEntityHooks } from "../modules/run-entity-hooks.js";
import type { createRelationRuntimeContext } from "../relations/create-relation-services.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

type GenericRecord = { readonly id: string; readonly tenantId: string };
type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

interface ImportExportEntityRecordsDeps {
  readonly entityRuntime: EntityRuntimeContext;
  readonly relationContext: ReturnType<typeof createRelationRuntimeContext>;
  readonly queryEngine?: QueryEngine;
  readonly crudHooks?: CrudHookDeps;
  readonly aggregation?: AggregationEmitterDeps;
}

const EXPORT_PAGE_SIZE = 100;

interface ImportEntityRecordsResult {
  readonly created: number;
  readonly updated: number;
  readonly items: readonly {
    readonly id: string;
    readonly operation: "created" | "updated";
  }[];
}

function prepareEntityRecordForWrite(
  entity: AnyDefinedEntity,
  record: Record<string, unknown>,
): Record<string, unknown> {
  return sanitizeFileFieldsForWrite(
    entity,
    prepareRecordSearchFields(entity, record),
  );
}

async function runCrudEntityHooks(
  app: FastifyInstance,
  request: FastifyRequest,
  crudHooks: CrudHookDeps | undefined,
  params: Parameters<typeof runEntityHooks>[2],
): Promise<Record<string, unknown>> {
  return runEntityHooks(
    app,
    request,
    buildCrudHookRunParams(crudHooks, request.ctx?.tenantId, params),
  );
}

function isRecordAccessibleToUser(
  entity: AnyDefinedEntity,
  record: Record<string, unknown>,
  userId: string,
): boolean {
  if (entity.metadata.tenantWideRead) {
    return true;
  }

  const accessUserIds = record.accessUserIds;
  if (Array.isArray(accessUserIds) && accessUserIds.includes(userId)) {
    return true;
  }

  return checkRecordAccess(record, userId).canRead;
}

async function fetchAllRecords(
  repository: TenantScopedEntityRepository<GenericRecord, unknown>,
  tenantId: string,
): Promise<GenericRecord[]> {
  const records: GenericRecord[] = [];
  let cursor: string | undefined;

  do {
    const page = await repository.findAll({
      tenantId,
      limit: EXPORT_PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    });
    records.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return records;
}

async function fetchAccessibleRecords(
  deps: ImportExportEntityRecordsDeps,
  entity: AnyDefinedEntity,
  entityName: string,
  tenantId: string,
  queryContext: QueryContext,
  repository: TenantScopedEntityRepository<GenericRecord, unknown>,
): Promise<GenericRecord[]> {
  if (deps.queryEngine) {
    const records: GenericRecord[] = [];
    let cursor: string | undefined;

    do {
      const result = await deps.queryEngine.find(
        entityName,
        {
          pagination: {
            limit: EXPORT_PAGE_SIZE,
            ...(cursor ? { cursor } : {}),
          },
        },
        queryContext,
      );
      records.push(...(result.data as GenericRecord[]));
      cursor = result.nextCursor;
    } while (cursor);

    return records;
  }

  const allRecords = await fetchAllRecords(repository, tenantId);
  return allRecords.filter((record) =>
    isRecordAccessibleToUser(
      entity,
      record as unknown as Record<string, unknown>,
      queryContext.userId,
    ),
  );
}

async function loadManyToManyRelations(
  entity: AnyDefinedEntity,
  recordId: string,
  tenantId: string,
  deps: ImportExportEntityRecordsDeps,
): Promise<Record<string, readonly string[]>> {
  const relations: Record<string, readonly string[]> = {};
  const joinHandler = deps.relationContext.joinHandlerFor(tenantId);

  for (const { fieldName, relation } of getJoinCollectionRelations(
    entity.metadata,
  )) {
    const targetEntity = deps.entityRuntime.resolveEntity(
      relation.target,
      tenantId,
    );
    if (!targetEntity) {
      continue;
    }

    const joinCollection = resolveJoinCollectionName(
      entity.name,
      targetEntity.name,
      relation,
    );
    const joins = await joinHandler.findLinkedTargets(
      tenantId,
      entity,
      recordId,
      targetEntity,
      joinCollection,
    );
    if (joins.length > 0) {
      relations[fieldName] = joins.map((join) => join.targetId);
    }
  }

  return relations;
}

export async function exportEntityRecordsJson(
  deps: ImportExportEntityRecordsDeps,
  tenantId: string,
  entityName: string,
  queryContext: QueryContext,
): Promise<ReturnType<typeof createEntityRecordsExportEnvelope>> {
  await deps.entityRuntime.loadTenantDefinitions(tenantId);

  const entity = deps.entityRuntime.resolveEntity(entityName, tenantId);
  if (!entity) {
    throw new Error("Entity not found.");
  }

  const repository = deps.entityRuntime.getRepository(tenantId, entityName);
  if (!repository) {
    throw new Error("Entity repository not found.");
  }

  const records = await fetchAccessibleRecords(
    deps,
    entity,
    entityName,
    tenantId,
    queryContext,
    repository,
  );
  const portableRecords: PortableEntityRecord[] = [];

  for (const record of records) {
    const recordData = record as unknown as Record<string, unknown>;
    const relations = await loadManyToManyRelations(
      entity,
      record.id,
      tenantId,
      deps,
    );
    portableRecords.push(
      toPortableEntityRecord(
        entity,
        recordData,
        Object.keys(relations).length > 0 ? relations : undefined,
      ),
    );
  }

  return createEntityRecordsExportEnvelope(entityName, portableRecords);
}

async function syncJoinRelationTargets(
  deps: ImportExportEntityRecordsDeps,
  params: {
    readonly tenantId: string;
    readonly sourceEntity: AnyDefinedEntity;
    readonly sourceId: string;
    readonly fieldName: string;
    readonly targetIds: readonly string[];
  },
): Promise<void> {
  const relationEntry = getJoinCollectionRelations(
    params.sourceEntity.metadata,
  ).find((entry) => entry.fieldName === params.fieldName);
  if (!relationEntry) {
    throw new Error(`Join relation field "${params.fieldName}" not found.`);
  }

  const targetEntity = deps.entityRuntime.resolveEntity(
    relationEntry.relation.target,
    params.tenantId,
  );
  if (!targetEntity) {
    throw new RelationError(
      "RELATION_NOT_FOUND",
      `Relation target "${relationEntry.relation.target}" does not exist.`,
    );
  }

  const joinCollection = resolveJoinCollectionName(
    params.sourceEntity.name,
    targetEntity.name,
    relationEntry.relation,
  );
  const joinHandler = deps.relationContext.joinHandlerFor(params.tenantId);
  const currentJoins = await joinHandler.findLinkedTargets(
    params.tenantId,
    params.sourceEntity,
    params.sourceId,
    targetEntity,
    joinCollection,
  );
  const nextTargetIds = [...new Set(params.targetIds)];
  const currentTargetIds = new Set(currentJoins.map((join) => join.targetId));
  const nextTargetIdSet = new Set(nextTargetIds);

  for (const join of currentJoins) {
    if (!nextTargetIdSet.has(join.targetId)) {
      await joinHandler.unlink(params.tenantId, join.joinCollection, join.id);
    }
  }

  for (const targetId of nextTargetIds) {
    if (!currentTargetIds.has(targetId)) {
      await joinHandler.link({
        sourceEntity: params.sourceEntity,
        sourceId: params.sourceId,
        targetEntity,
        targetId,
        tenantId: params.tenantId,
        joinCollection,
      });
    }
  }
}

interface ImportPreparedItem {
  readonly mode: "create" | "update";
  readonly id?: string;
  readonly documentPayload: Record<string, unknown>;
  readonly relations: Record<string, readonly string[]>;
  readonly existingRecord?: Record<string, unknown>;
}

function isMissingRelationValue(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function buildImportBatchIdsByEntity(
  entityName: string,
  items: readonly { readonly id?: string }[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const batchIds = new Set<string>();
  for (const item of items) {
    if (item.id) {
      batchIds.add(item.id);
    }
  }
  return new Map([[entityName, batchIds]]);
}

async function validateImportForeignKeyRelations(
  entity: AnyDefinedEntity,
  record: Record<string, unknown>,
  tenantId: string,
  pathPrefix: string,
  deps: ImportExportEntityRecordsDeps,
  batchIdsByEntity: ReadonlyMap<string, ReadonlySet<string>>,
  mode: "create" | "update",
): Promise<readonly EntityRecordJsonError[]> {
  const errors: EntityRecordJsonError[] = [];

  for (const { fieldName, relation } of getForeignKeyRelationFields(
    entity.metadata,
  )) {
    const value = record[fieldName];
    const isRequired =
      relation.required === true ||
      entity.metadata.fields[fieldName]?.required === true;

    if (isMissingRelationValue(value)) {
      if (mode === "create" && isRequired) {
        errors.push({
          path: pathPrefix,
          message: `Relation field "${fieldName}" is required.`,
        });
      }
      continue;
    }

    if (typeof value !== "string") {
      errors.push({
        path: pathPrefix,
        message: `Relation field "${fieldName}" must be a string id.`,
      });
      continue;
    }

    const targetEntity = deps.entityRuntime.resolveEntity(
      relation.target,
      tenantId,
    );
    if (!targetEntity) {
      errors.push({
        path: pathPrefix,
        message: `Unknown relation target "${relation.target}".`,
      });
      continue;
    }

    const repository = deps.entityRuntime.getRepository(
      tenantId,
      relation.target,
    );
    if (!repository) {
      errors.push({
        path: pathPrefix,
        message: `Relation target "${relation.target}" repository not found.`,
      });
      continue;
    }

    const referenced = await repository.findById(value, tenantId);
    if (!referenced) {
      if (batchIdsByEntity.get(relation.target)?.has(value)) {
        continue;
      }

      errors.push({
        path: pathPrefix,
        message: `Referenced ${relation.target} "${value}" was not found in this tenant.`,
      });
      continue;
    }
  }

  return errors;
}

function sortPreparedItemsByBatchDependencies(
  entity: AnyDefinedEntity,
  items: readonly ImportPreparedItem[],
  batchIds: ReadonlySet<string>,
): ImportPreparedItem[] | { readonly ok: false; readonly message: string } {
  if (items.length <= 1) {
    return [...items];
  }

  const fkFields = getForeignKeyRelationFields(entity.metadata);
  const sorted: ImportPreparedItem[] = [];
  const placedIds = new Set<string>();
  const remaining = [...items];

  let progress = true;
  while (remaining.length > 0 && progress) {
    progress = false;
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const item = remaining[index]!;
      const batchDependencies = fkFields.flatMap(({ fieldName, relation }) => {
        if (relation.target !== entity.name) {
          return [];
        }

        const value = item.documentPayload[fieldName];
        if (typeof value !== "string" || value.trim().length === 0) {
          return [];
        }

        return batchIds.has(value) ? [value] : [];
      });

      if (
        batchDependencies.every((dependencyId) => placedIds.has(dependencyId))
      ) {
        sorted.push(item);
        if (item.id) {
          placedIds.add(item.id);
        }
        remaining.splice(index, 1);
        progress = true;
      }
    }
  }

  if (remaining.length > 0) {
    return {
      ok: false,
      message:
        "Import batch contains circular or unresolved relation dependencies.",
    };
  }

  return sorted;
}
async function validateManyToManyTargets(
  entity: AnyDefinedEntity,
  relations: Record<string, readonly string[]>,
  tenantId: string,
  pathPrefix: string,
  deps: ImportExportEntityRecordsDeps,
  batchIdsByEntity: ReadonlyMap<string, ReadonlySet<string>>,
): Promise<readonly EntityRecordJsonError[]> {
  const errors: EntityRecordJsonError[] = [];

  for (const [fieldName, targetIds] of Object.entries(relations)) {
    const relationEntry = getJoinCollectionRelations(entity.metadata).find(
      (entry) => entry.fieldName === fieldName,
    );
    if (!relationEntry) {
      continue;
    }

    const targetEntity = deps.entityRuntime.resolveEntity(
      relationEntry.relation.target,
      tenantId,
    );
    if (!targetEntity) {
      errors.push({
        path: `${pathPrefix}.relations.${fieldName}`,
        message: `Relation target "${relationEntry.relation.target}" does not exist.`,
      });
      continue;
    }

    const repository = deps.entityRuntime.getRepository(
      tenantId,
      relationEntry.relation.target,
    );
    if (!repository) {
      errors.push({
        path: `${pathPrefix}.relations.${fieldName}`,
        message: `Relation target "${relationEntry.relation.target}" repository not found.`,
      });
      continue;
    }

    for (const [targetIndex, targetId] of targetIds.entries()) {
      const targetRecord = await repository.findById(targetId, tenantId);
      if (
        !targetRecord &&
        !batchIdsByEntity.get(relationEntry.relation.target)?.has(targetId)
      ) {
        errors.push({
          path: `${pathPrefix}.relations.${fieldName}[${targetIndex}]`,
          message: `Referenced ${relationEntry.relation.target} "${targetId}" was not found in this tenant.`,
        });
      }
    }
  }

  return errors;
}

export async function importEntityRecordsJson(
  app: FastifyInstance,
  request: FastifyRequest,
  deps: ImportExportEntityRecordsDeps,
  tenantId: string,
  entityName: string,
  body: unknown,
): Promise<
  | { readonly ok: true; readonly data: ImportEntityRecordsResult }
  | { readonly ok: false; readonly errors: readonly EntityRecordJsonError[] }
> {
  await deps.entityRuntime.loadTenantDefinitions(tenantId);

  const entity = deps.entityRuntime.resolveEntity(entityName, tenantId);
  if (!entity) {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "Entity not found." }],
    };
  }

  const repository = deps.entityRuntime.getRepository(tenantId, entityName);
  if (!repository) {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "Entity repository not found." }],
    };
  }

  const normalized = normalizeEntityRecordsImportInput(body);
  if (!normalized.ok) {
    return normalized;
  }

  const validated = validateEntityRecordsImport(entity, normalized.data);
  if (!validated.ok) {
    return validated;
  }

  const errors: EntityRecordJsonError[] = [];
  const batchIdsByEntity = buildImportBatchIdsByEntity(
    entityName,
    validated.data,
  );
  const preparedItems: ImportPreparedItem[] = [];

  for (const [index, item] of validated.data.entries()) {
    const pathPrefix = `[${index}]`;

    if (item.mode === "update" && item.id) {
      const existing = await repository.findById(item.id, tenantId);
      if (existing) {
        const existingRecord = existing as unknown as Record<string, unknown>;
        const mergedDraft = prepareEntityRecordForWrite(entity, {
          ...existingRecord,
          ...item.documentPayload,
          id: item.id,
          tenantId,
        });

        errors.push(
          ...(await validateImportForeignKeyRelations(
            entity,
            mergedDraft,
            tenantId,
            pathPrefix,
            deps,
            batchIdsByEntity,
            "update",
          )),
        );

        errors.push(
          ...(await validateManyToManyTargets(
            entity,
            item.relations,
            tenantId,
            pathPrefix,
            deps,
            batchIdsByEntity,
          )),
        );

        preparedItems.push({
          mode: "update",
          id: item.id,
          documentPayload: item.documentPayload,
          relations: item.relations,
          existingRecord,
        });
        continue;
      }
    }

    const specifiedId =
      item.mode === "update" && item.id ? item.id.trim() : undefined;

    const createDraft = prepareEntityRecordForWrite(entity, {
      ...item.documentPayload,
      id: specifiedId ?? "pending",
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: request.ctx?.uid ?? "",
      accessUserIds: request.ctx?.uid ? [request.ctx.uid] : [],
      sharedWith: {},
    });

    errors.push(
      ...(await validateImportForeignKeyRelations(
        entity,
        createDraft,
        tenantId,
        pathPrefix,
        deps,
        batchIdsByEntity,
        "create",
      )),
    );

    errors.push(
      ...(await validateManyToManyTargets(
        entity,
        item.relations,
        tenantId,
        pathPrefix,
        deps,
        batchIdsByEntity,
      )),
    );

    preparedItems.push({
      mode: "create",
      ...(specifiedId ? { id: specifiedId } : {}),
      documentPayload: item.documentPayload,
      relations: item.relations,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const batchIds = batchIdsByEntity.get(entityName) ?? new Set<string>();
  const sortedPreparedItems = sortPreparedItemsByBatchDependencies(
    entity,
    preparedItems,
    batchIds,
  );
  if (!Array.isArray(sortedPreparedItems)) {
    return {
      ok: false,
      errors: [{ path: "(root)", message: sortedPreparedItems.message }],
    };
  }

  const items: ImportEntityRecordsResult["items"][number][] = [];
  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();
  const ownerId = request.ctx?.uid ?? "";

  for (const item of sortedPreparedItems) {
    if (item.mode === "create") {
      const recordId = item.id ?? nanoid();
      let currentData = prepareEntityRecordForWrite(entity, {
        ...item.documentPayload,
        id: recordId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        ownerId,
        accessUserIds: ownerId ? [ownerId] : [],
        sharedWith: {},
      });

      const entityServices = deps.crudHooks
        ? await resolveCrudHookEntityServices(
            app,
            request,
            tenantId,
            deps.crudHooks,
          )
        : undefined;

      currentData = await runCrudEntityHooks(app, request, deps.crudHooks, {
        entityName: entity.name,
        phase: "before",
        operation: "create",
        current: currentData,
        ...(entityServices ? { entityServices } : {}),
      });

      const parsedRecord = entity.schema.parse(currentData);
      const createdRecord = await repository.create(
        tenantId,
        parsedRecord as GenericRecord,
      );

      await runCrudEntityHooks(app, request, deps.crudHooks, {
        entityName: entity.name,
        phase: "after",
        operation: "create",
        current: createdRecord as unknown as Record<string, unknown>,
        ...(entityServices ? { entityServices } : {}),
      });

      for (const [fieldName, targetIds] of Object.entries(item.relations)) {
        await syncJoinRelationTargets(deps, {
          tenantId,
          sourceEntity: entity,
          sourceId: createdRecord.id,
          fieldName,
          targetIds,
        });
      }

      if (deps.aggregation) {
        await emitAggregationEventIfNeeded(deps.aggregation, {
          tenantId,
          entityName: entity.name,
          operation: "CREATE",
          documentId: createdRecord.id,
          before: null,
          after: createdRecord as unknown as Record<string, unknown>,
          businessFieldNames: Object.keys(entity.metadata.fields),
        });
      }

      created += 1;
      items.push({ id: createdRecord.id, operation: "created" });
      continue;
    }

    const existingRecord = item.existingRecord!;
    const recordId = item.id!;
    let merged = prepareEntityRecordForWrite(entity, {
      ...existingRecord,
      ...item.documentPayload,
      id: recordId,
      tenantId: existingRecord.tenantId,
      updatedAt: now,
    });

    const entityServices = deps.crudHooks
      ? await resolveCrudHookEntityServices(
          app,
          request,
          tenantId,
          deps.crudHooks,
        )
      : undefined;

    merged = await runCrudEntityHooks(app, request, deps.crudHooks, {
      entityName: entity.name,
      phase: "before",
      operation: "update",
      current: merged,
      previous: existingRecord,
      ...(entityServices ? { entityServices } : {}),
    });

    const parsedRecord = entity.schema.parse(merged);
    const updatePayload: Record<string, unknown> = {
      ...(parsedRecord as Record<string, unknown>),
    };
    delete updatePayload.id;
    delete updatePayload.tenantId;
    delete updatePayload.createdAt;

    const updatedRecord = await repository.update(
      recordId,
      tenantId,
      updatePayload,
    );
    if (!updatedRecord) {
      throw new Error(`Failed to update record "${recordId}".`);
    }

    const validatedRecord = entity.schema.parse(updatedRecord);

    await runCrudEntityHooks(app, request, deps.crudHooks, {
      entityName: entity.name,
      phase: "after",
      operation: "update",
      current: validatedRecord as Record<string, unknown>,
      previous: existingRecord,
      ...(entityServices ? { entityServices } : {}),
    });

    for (const [fieldName, targetIds] of Object.entries(item.relations)) {
      await syncJoinRelationTargets(deps, {
        tenantId,
        sourceEntity: entity,
        sourceId: recordId,
        fieldName,
        targetIds,
      });
    }

    if (deps.aggregation) {
      await emitAggregationEventIfNeeded(deps.aggregation, {
        tenantId,
        entityName: entity.name,
        operation: "UPDATE",
        documentId: recordId,
        before: existingRecord,
        after: validatedRecord as Record<string, unknown>,
        businessFieldNames: Object.keys(entity.metadata.fields),
      });
    }

    updated += 1;
    items.push({ id: recordId, operation: "updated" });
  }

  if (created + updated > 0) {
    deps.entityRuntime.invalidateInMemoryListSnapshot(tenantId, entityName);
  }

  return {
    ok: true,
    data: { created, updated, items },
  };
}
