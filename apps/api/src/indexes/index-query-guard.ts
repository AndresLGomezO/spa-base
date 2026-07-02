import type { FastifyReply } from "fastify";

import type {
  CreateIndexProvisionEventInput,
  IndexProvisionBlockedOperation,
} from "@repo/debug-logs";
import type { FirestoreIndexStatusStore } from "@repo/gcp-firebase";
import { resolveEntityCollection } from "@repo/firestore-indexes";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError } from "../crud/response.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";

export class IndexCreatingError extends Error {
  readonly code = "INDEX_CREATING" as const;
  readonly collection: string;
  readonly retryAfterSeconds: number;

  constructor(collection: string, retryAfterSeconds = 60) {
    super(
      `Firestore indexes for "${collection}" are still building. Retry in about ${retryAfterSeconds} seconds.`,
    );
    this.name = "IndexCreatingError";
    this.collection = collection;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class IndexProvisioningFailedError extends Error {
  readonly code = "INDEX_PROVISIONING_FAILED" as const;
  readonly collection: string;
  readonly errors: ReadonlyArray<{
    readonly signature: string;
    readonly message: string;
  }>;

  constructor(
    collection: string,
    errors: ReadonlyArray<{
      readonly signature: string;
      readonly message: string;
    }>,
  ) {
    super(
      `Firestore index provisioning failed for "${collection}". See details for affected indexes.`,
    );
    this.name = "IndexProvisioningFailedError";
    this.collection = collection;
    this.errors = errors;
  }
}

export type IndexProvisionEventWriter = (
  input: CreateIndexProvisionEventInput,
) => void | Promise<void>;

interface AssertCollectionIndexesReadyOptions {
  readonly blockedOperation?: IndexProvisionBlockedOperation;
  readonly tenantId?: string;
  readonly recordEvent?: IndexProvisionEventWriter;
}

async function recordOperationBlocked(
  options: AssertCollectionIndexesReadyOptions | undefined,
  collection: string,
  errorMessage: string,
): Promise<void> {
  if (!options?.recordEvent) {
    return;
  }

  await options.recordEvent({
    timestamp: new Date().toISOString(),
    event: "operation_blocked",
    collection,
    errorMessage,
    blockedOperation: options.blockedOperation ?? "list_query",
    ...(options.tenantId ? { tenantId: options.tenantId } : {}),
  });
}

export async function assertCollectionIndexesReady(
  statusStore: FirestoreIndexStatusStore | undefined,
  collection: string,
  options?: AssertCollectionIndexesReadyOptions,
): Promise<void> {
  if (!statusStore) {
    return;
  }

  const failed = await statusStore.getFailedRecords(collection);
  if (failed.length > 0) {
    await recordOperationBlocked(
      options,
      collection,
      `Index provisioning failed for "${collection}".`,
    );
    throw new IndexProvisioningFailedError(
      collection,
      failed.map((record) => ({
        signature: record.signature,
        message: record.errorMessage ?? "Index provisioning failed.",
      })),
    );
  }

  const creating = await statusStore.hasCreating(collection);
  if (creating) {
    await recordOperationBlocked(
      options,
      collection,
      `Indexes for "${collection}" are still building.`,
    );
    throw new IndexCreatingError(collection);
  }
}

export async function assertTenantIndexesReady(
  statusStore: FirestoreIndexStatusStore | undefined,
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
  options?: AssertCollectionIndexesReadyOptions,
): Promise<void> {
  if (!statusStore) {
    return;
  }

  const entities = entityRuntime.getEntitiesForTenant(tenantId);
  const collectionNames = [
    ...new Set(entities.map((entity) => resolveEntityCollection(entity))),
  ];

  for (const collection of collectionNames) {
    await assertCollectionIndexesReady(statusStore, collection, {
      ...options,
      tenantId,
    });
  }
}

export function mapIndexGuardError(
  reply: FastifyReply,
  error: unknown,
): boolean {
  if (error instanceof IndexCreatingError) {
    reply.header("Retry-After", String(error.retryAfterSeconds));
    replyWithError(reply, 503, ApiErrorCode.INDEX_CREATING, error.message, {
      collection: error.collection,
    });
    return true;
  }

  if (error instanceof IndexProvisioningFailedError) {
    replyWithError(
      reply,
      503,
      ApiErrorCode.INDEX_PROVISIONING_FAILED,
      error.message,
      { collection: error.collection, errors: error.errors },
    );
    return true;
  }

  return false;
}
