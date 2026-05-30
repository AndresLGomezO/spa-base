import type {
  FastifyInstance,
  FastifyReply,
  preHandlerAsyncHookHandler,
} from "fastify";
import { RelationError } from "@repo/entity-relations";
import {
  getJoinCollectionRelations,
  resolveJoinCollectionName,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import { z } from "zod";

import { requireRequestTenant } from "../auth/resolve-target-tenant-id.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { parseOrFormatError } from "../crud/validation.js";
import { createParametricEntityPermissionGuards } from "../rbac/create-entity-permission-guards.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { createRelationRuntimeContext } from "../relations/create-relation-services.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const relationParamsSchema = z.object({
  entityName: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  fieldName: z.string().trim().min(1),
});

const syncRelationBodySchema = z.object({
  targetIds: z.array(z.string().trim().min(1)),
});

interface RegisterEntityRelationRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly relationContext: ReturnType<typeof createRelationRuntimeContext>;
}

function mapRelationErrorToResponse(
  reply: FastifyReply,
  error: RelationError,
): void {
  const statusCode = error.code === "RELATION_DELETE_RESTRICTED" ? 409 : 400;
  replyWithError(reply, statusCode, error.code as ApiErrorCode, error.message);
}

function handleRelationError(reply: FastifyReply, error: unknown): boolean {
  if (error instanceof RelationError) {
    mapRelationErrorToResponse(reply, error);
    return true;
  }
  return false;
}

function resolveJoinRelationField(entity: AnyDefinedEntity, fieldName: string) {
  return getJoinCollectionRelations(entity.metadata).find(
    (entry) => entry.fieldName === fieldName,
  );
}

async function syncJoinRelationTargets(
  relationContext: ReturnType<typeof createRelationRuntimeContext>,
  entityRuntime: EntityRuntimeContext,
  params: {
    readonly tenantId: string;
    readonly sourceEntity: AnyDefinedEntity;
    readonly sourceId: string;
    readonly fieldName: string;
    readonly targetIds: readonly string[];
  },
): Promise<readonly string[]> {
  const relationEntry = resolveJoinRelationField(
    params.sourceEntity,
    params.fieldName,
  );
  if (!relationEntry) {
    throw new Error("Join relation field not found.");
  }

  const targetEntity = entityRuntime.resolveEntity(
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
  const joinHandler = relationContext.joinHandlerFor(params.tenantId);
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

  return nextTargetIds;
}

export async function registerEntityRelationRoutes(
  app: FastifyInstance,
  options: RegisterEntityRelationRoutesOptions,
): Promise<void> {
  const authorize = createParametricEntityPermissionGuards(
    options.permissionDeps,
  );
  const basePath = "/api/:entityName/:recordId/relations/:fieldName";

  app.get(
    basePath,
    { preHandler: [options.authenticate, authorize.get] },
    async (request, reply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const parsedParams = parseOrFormatError(
        relationParamsSchema,
        request.params,
      );
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
          parsedParams.details,
        );
      }

      const { entityName, recordId, fieldName } = parsedParams.data;
      await options.entityRuntime.loadTenantDefinitions(tenantId);

      const entity = options.entityRuntime.resolveEntity(entityName, tenantId);
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }

      const relationEntry = resolveJoinRelationField(entity, fieldName);
      if (!relationEntry) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `Field "${fieldName}" is not a many-to-many relation.`,
        );
      }

      const repository = options.entityRuntime.getRepository(
        tenantId,
        entityName,
      );
      if (!repository) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity repository not found.",
        );
      }

      const record = await repository.findById(recordId, tenantId);
      if (!record) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Record not found.",
        );
      }

      const targetEntity = options.entityRuntime.resolveEntity(
        relationEntry.relation.target,
        tenantId,
      );
      if (!targetEntity) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `Relation target "${relationEntry.relation.target}" does not exist.`,
        );
      }

      try {
        const joinCollection = resolveJoinCollectionName(
          entity.name,
          targetEntity.name,
          relationEntry.relation,
        );
        const joins = await options.relationContext
          .joinHandlerFor(tenantId)
          .findLinkedTargets(
            tenantId,
            entity,
            recordId,
            targetEntity,
            joinCollection,
          );

        return successEnvelope({
          targetIds: joins.map((join) => join.targetId),
        });
      } catch (error) {
        if (handleRelationError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  app.put(
    basePath,
    { preHandler: [options.authenticate, authorize.update] },
    async (request, reply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const parsedParams = parseOrFormatError(
        relationParamsSchema,
        request.params,
      );
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
          parsedParams.details,
        );
      }

      const parsedBody = parseOrFormatError(
        syncRelationBodySchema,
        request.body,
      );
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.details,
        );
      }

      const { entityName, recordId, fieldName } = parsedParams.data;
      await options.entityRuntime.loadTenantDefinitions(tenantId);

      const entity = options.entityRuntime.resolveEntity(entityName, tenantId);
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }

      const relationEntry = resolveJoinRelationField(entity, fieldName);
      if (!relationEntry) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `Field "${fieldName}" is not a many-to-many relation.`,
        );
      }

      const repository = options.entityRuntime.getRepository(
        tenantId,
        entityName,
      );
      if (!repository) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity repository not found.",
        );
      }

      const record = await repository.findById(recordId, tenantId);
      if (!record) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Record not found.",
        );
      }

      try {
        const targetIds = await syncJoinRelationTargets(
          options.relationContext,
          options.entityRuntime,
          {
            tenantId,
            sourceEntity: entity,
            sourceId: recordId,
            fieldName,
            targetIds: parsedBody.data.targetIds,
          },
        );

        return successEnvelope({ targetIds });
      } catch (error) {
        if (handleRelationError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );
}
