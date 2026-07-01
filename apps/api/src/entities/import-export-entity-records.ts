import type { FastifyInstance, FastifyRequest } from "fastify";
import { RelationError } from "@repo/entity-relations";
import {
  createEntityRecordsExportEnvelope,
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
import { nanoid } from "nanoid";

import { emitAggregationEventIfNeeded } from "../aggregation/emit-aggregation-event.js";
import type { AggregationEmitterDeps } from "../aggregation/emit-aggregation-event.js";
import { sanitizeFileFieldsForWrite } from "../entity-files/entity-file-field-utils.js";
import type { CrudHookDeps } from "../hooks/crud-hook-deps.types.js";
import { resolveCrudHookEntityServices } from "../hooks/crud-hook-deps.js";
import { createRecordDataHookExecution } from "../hooks/record-data-hook-execution.js";
import { runEntityHooks } from "../modules/run-entity-hooks.js";
import type { createRelationRuntimeContext } from "../relations/create-relation-services.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

type GenericRecord = { readonly id: string; readonly tenantId: string };
type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

interface ImportExportEntityRecordsDeps {
  readonly entityRuntime: EntityRuntimeContext;
  readonly relationContext: ReturnType<typeof createRelationRuntimeContext>;
  readonly crudHooks?: CrudHookDeps;
  readonly aggregation?: AggregationEmitterDeps;
}

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
  const ctx = request.ctx;
  return runEntityHooks(app, request, {
    ...params,
    ...(crudHooks?.enqueueDataHookJob
      ? { enqueueDataHookJob: crudHooks.enqueueDataHookJob }
      : {}),
    ...(crudHooks?.hookExecutionRepository && ctx?.tenantId
      ? {
          recordDataHookExecution: createRecordDataHookExecution(
            crudHooks.hookExecutionRepository,
            ctx.tenantId,
          ),
        }
      : {}),
    ...(crudHooks?.callWebhook ? { callWebhook: crudHooks.callWebhook } : {}),
  });
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
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    records.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return records;
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

  const records = await fetchAllRecords(repository, tenantId);
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

async function validateManyToManyTargets(
  entity: AnyDefinedEntity,
  relations: Record<string, readonly string[]>,
  tenantId: string,
  pathPrefix: string,
  deps: ImportExportEntityRecordsDeps,
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
      if (!targetRecord) {
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
  const relationHooks = deps.relationContext.hooksFor(entityName);
  const preparedItems: Array<{
    readonly mode: "create" | "update";
    readonly id?: string;
    readonly documentPayload: Record<string, unknown>;
    readonly relations: Record<string, readonly string[]>;
    readonly existingRecord?: Record<string, unknown>;
  }> = [];

  for (const [index, item] of validated.data.entries()) {
    const pathPrefix = `[${index}]`;

    if (item.mode === "update" && item.id) {
      const existing = await repository.findById(item.id, tenantId);
      if (!existing) {
        errors.push({
          path: `${pathPrefix}.id`,
          message: `Record "${item.id}" was not found in this tenant.`,
        });
        continue;
      }

      const existingRecord = existing as unknown as Record<string, unknown>;
      const mergedDraft = prepareEntityRecordForWrite(entity, {
        ...existingRecord,
        ...item.documentPayload,
        id: item.id,
        tenantId,
      });

      if (relationHooks) {
        try {
          await relationHooks.validateWrite(mergedDraft, "update");
        } catch (error) {
          if (error instanceof RelationError) {
            errors.push({
              path: pathPrefix,
              message: error.message,
            });
          } else {
            throw error;
          }
        }
      }

      errors.push(
        ...(await validateManyToManyTargets(
          entity,
          item.relations,
          tenantId,
          pathPrefix,
          deps,
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

    const createDraft = prepareEntityRecordForWrite(entity, {
      ...item.documentPayload,
      id: "pending",
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: request.ctx?.uid ?? "",
      accessUserIds: request.ctx?.uid ? [request.ctx.uid] : [],
      sharedWith: {},
    });

    if (relationHooks) {
      try {
        await relationHooks.validateWrite(createDraft, "create");
      } catch (error) {
        if (error instanceof RelationError) {
          errors.push({
            path: pathPrefix,
            message: error.message,
          });
        } else {
          throw error;
        }
      }
    }

    errors.push(
      ...(await validateManyToManyTargets(
        entity,
        item.relations,
        tenantId,
        pathPrefix,
        deps,
      )),
    );

    preparedItems.push({
      mode: "create",
      documentPayload: item.documentPayload,
      relations: item.relations,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const items: ImportEntityRecordsResult["items"][number][] = [];
  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();
  const ownerId = request.ctx?.uid ?? "";

  for (const item of preparedItems) {
    if (item.mode === "create") {
      const recordId = nanoid();
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

  return {
    ok: true,
    data: { created, updated, items },
  };
}
