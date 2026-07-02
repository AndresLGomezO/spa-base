import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  buildOwnershipListIndex,
  dedupeIndexes,
  indexesForEntity,
  planIndexesForTenant,
  type FirestoreCompositeIndex,
} from "@repo/firestore-indexes";
import {
  ensureFirestoreIndexes,
  summarizeIndexProvisioningStatus,
  type FirestoreIndexStatusStore,
} from "@repo/gcp-firebase";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { requireRequestTenant } from "../auth/resolve-target-tenant-id.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { parseOrFormatError } from "../crud/validation.js";
import { summarizeTenantIndexProvisioningStatus } from "./tenant-index-status.js";

const statusQuerySchema = z.object({
  collection: z.string().trim().min(1),
  signature: z.string().trim().min(1).optional(),
});

const provisionBodySchema = z.object({
  collection: z.string().trim().min(1),
});

interface RegisterIndexRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly entityRuntime: EntityRuntimeContext;
  readonly statusStore?: FirestoreIndexStatusStore;
  readonly ensureFirestoreIndexes: boolean;
  readonly indexProvisioningTopic?: string;
  readonly publishToPubSub: boolean;
}

export async function registerIndexRoutes(
  app: FastifyInstance,
  options: RegisterIndexRoutesOptions,
): Promise<void> {
  const basePath = "/api/indexes";

  app.get(
    `${basePath}/status`,
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      if (!options.statusStore) {
        return replyWithError(
          reply,
          501,
          ApiErrorCode.QUERY_UNSUPPORTED,
          "Index status tracking is not configured.",
        );
      }

      const parsed = parseOrFormatError(statusQuerySchema, request.query ?? {});
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query parameters.",
          parsed.details,
        );
      }

      const { collection, signature } = parsed.data;
      if (signature) {
        const record = await options.statusStore.getBySignature(signature);
        return reply.send(successEnvelope(record));
      }

      const records = await options.statusStore.listByCollection(collection);
      return reply.send(
        successEnvelope(summarizeIndexProvisioningStatus(collection, records)),
      );
    },
  );

  app.get(
    `${basePath}/plan`,
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const entities = options.entityRuntime.getEntitiesForTenant(tenantId);
      return reply.send(successEnvelope(planIndexesForTenant(entities)));
    },
  );

  app.get(
    `${basePath}/tenant-status`,
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      if (!options.statusStore) {
        return replyWithError(
          reply,
          501,
          ApiErrorCode.QUERY_UNSUPPORTED,
          "Index status tracking is not configured.",
        );
      }

      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const summary = await summarizeTenantIndexProvisioningStatus(
        options.statusStore,
        options.entityRuntime,
        tenantId,
      );
      return reply.send(successEnvelope(summary));
    },
  );

  app.post(
    `${basePath}/provision`,
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      if (!options.ensureFirestoreIndexes) {
        return replyWithError(
          reply,
          501,
          ApiErrorCode.QUERY_UNSUPPORTED,
          "Runtime index provisioning is disabled (ENSURE_FIRESTORE_INDEXES=false).",
        );
      }

      const parsed = parseOrFormatError(
        provisionBodySchema,
        request.body ?? {},
      );
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request body.",
          parsed.details,
        );
      }

      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) {
        return;
      }

      const { collection } = parsed.data;
      const indexes = resolveIndexesForCollection(
        options.entityRuntime,
        tenantId,
        collection,
      );

      if (options.publishToPubSub && options.indexProvisioningTopic) {
        const { publishIndexProvisioningMessage } =
          await import("@repo/gcp-firebase");
        for (const index of indexes) {
          await publishIndexProvisioningMessage(
            options.firebaseAdminConfig.projectId,
            options.indexProvisioningTopic,
            index,
          );
        }
        return reply.status(202).send(
          successEnvelope({
            collection,
            queued: indexes.length,
            mode: "pubsub",
          }),
        );
      }

      await ensureFirestoreIndexes(indexes, {
        projectId: options.firebaseAdminConfig.projectId,
        statusStore: options.statusStore,
      });

      return reply.status(202).send(
        successEnvelope({
          collection,
          provisioned: indexes.length,
          mode: "inline",
        }),
      );
    },
  );
}

function resolveIndexesForCollection(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
  collection: string,
): FirestoreCompositeIndex[] {
  const entities = entityRuntime.getEntitiesForTenant(tenantId);
  const matched = entities.filter(
    (entity) => entity.metadata.collection === collection,
  );

  if (matched.length > 0) {
    return dedupeIndexes(matched.flatMap((entity) => indexesForEntity(entity)));
  }

  return [buildOwnershipListIndex(collection)];
}
