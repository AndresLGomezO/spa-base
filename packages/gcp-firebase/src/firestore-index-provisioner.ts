import firestore from "@google-cloud/firestore";

import {
  computeIndexSignature,
  indexesForEntity,
  type FirestoreCompositeIndex,
  type FirestoreIndexField,
} from "@repo/firestore-indexes";
import type { DefinedEntity, FieldDefinitions } from "@repo/entities";

import type { FirestoreIndexHint } from "./firestore-entity-query-executor.js";
import type { FirestoreIndexStatusStore } from "./firestore-index-status.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

interface AdminIndexField {
  readonly fieldPath?: string;
  readonly order?: "ASCENDING" | "DESCENDING";
  readonly arrayConfig?: "CONTAINS";
}

type FirestoreAdminClient = InstanceType<
  typeof firestore.v1.FirestoreAdminClient
>;

let adminClient: FirestoreAdminClient | undefined;

function getAdminClient(): FirestoreAdminClient {
  adminClient ??= new firestore.v1.FirestoreAdminClient();
  return adminClient;
}

const DEFAULT_ENSURE_CONCURRENCY = 1;
const DEFAULT_BATCH_DELAY_MS = 400;
const MAX_TRANSIENT_RETRIES = 3;
const TRANSIENT_RETRY_BASE_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? error.code : undefined;
  if (code === 6 || code === "ALREADY_EXISTS") {
    return true;
  }
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  return (
    message.includes("ALREADY_EXISTS") || message.includes("already exists")
  );
}

function isTransientAdminError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? error.code : undefined;
  return (
    code === 4 ||
    code === "DEADLINE_EXCEEDED" ||
    code === 8 ||
    code === "RESOURCE_EXHAUSTED" ||
    code === 10 ||
    code === "ABORTED" ||
    code === 14 ||
    code === "UNAVAILABLE"
  );
}

function toAdminIndexFields(
  fields: readonly FirestoreIndexField[],
): AdminIndexField[] {
  return fields.map((field) => {
    if ("arrayConfig" in field) {
      return {
        fieldPath: field.fieldPath,
        arrayConfig: field.arrayConfig,
      };
    }
    return {
      fieldPath: field.fieldPath,
      order: field.order,
    };
  });
}

export function buildIndexFromHint(
  hint: FirestoreIndexHint,
): FirestoreCompositeIndex {
  const fields: FirestoreIndexField[] = [];

  for (const filter of hint.filters) {
    if (filter.operator === "array-contains") {
      fields.push({ fieldPath: filter.field, arrayConfig: "CONTAINS" });
      continue;
    }
    fields.push({ fieldPath: filter.field, order: "ASCENDING" });
  }

  const sortField = hint.sort?.field ?? "id";
  const sortDirection =
    hint.sort?.direction === "desc" ? "DESCENDING" : "ASCENDING";

  if (!fields.some((field) => field.fieldPath === sortField)) {
    fields.push({ fieldPath: sortField, order: sortDirection });
  }

  if (sortField !== "id" && !fields.some((field) => field.fieldPath === "id")) {
    fields.push({ fieldPath: "id", order: sortDirection });
  }

  return {
    collectionGroup: hint.collection,
    queryScope: "COLLECTION",
    fields,
  };
}

export interface EnsureFirestoreIndexesOptions {
  readonly projectId: string;
  readonly databaseId?: string;
  readonly statusStore?: FirestoreIndexStatusStore;
  readonly onEnsured?: (index: FirestoreCompositeIndex) => void;
  readonly onError?: (error: unknown, index: FirestoreCompositeIndex) => void;
  readonly concurrency?: number;
  readonly batchDelayMs?: number;
  readonly forceRetry?: boolean;
  readonly provisionTenantId?: string;
  readonly provisionTrigger?: string;
  readonly onProvisionEvent?: (event: {
    readonly event: "ensure_requested" | "creating" | "ready" | "error";
    readonly index: FirestoreCompositeIndex;
    readonly tenantId?: string;
    readonly trigger?: string;
    readonly errorMessage?: string;
    readonly operationName?: string;
    readonly retryExhausted?: boolean;
  }) => void | Promise<void>;
}

interface QueuedIndexJob {
  readonly index: FirestoreCompositeIndex;
  readonly options: EnsureFirestoreIndexesOptions;
  readonly signature: string;
  readonly forceRetry: boolean;
}

let queueConcurrency = DEFAULT_ENSURE_CONCURRENCY;
let queueBatchDelayMs = DEFAULT_BATCH_DELAY_MS;
const pendingJobs = new Map<string, QueuedIndexJob>();
let queueWorkerRunning = false;

export function configureIndexProvisioningQueue(options: {
  readonly concurrency?: number;
  readonly batchDelayMs?: number;
}): void {
  if (options.concurrency !== undefined) {
    queueConcurrency = Math.max(1, options.concurrency);
  }
  if (options.batchDelayMs !== undefined) {
    queueBatchDelayMs = Math.max(0, options.batchDelayMs);
  }
}

function resolveBatchDelayMs(options: EnsureFirestoreIndexesOptions): number {
  return options.batchDelayMs ?? queueBatchDelayMs;
}

function enqueueIndexes(
  indexes: readonly FirestoreCompositeIndex[],
  options: EnsureFirestoreIndexesOptions,
  forceRetry = false,
): void {
  for (const index of indexes) {
    const signature = computeIndexSignature(index);
    pendingJobs.set(signature, {
      index,
      options,
      signature,
      forceRetry: forceRetry || options.forceRetry === true,
    });
  }
  void drainIndexProvisioningQueue();
}

async function drainIndexProvisioningQueue(): Promise<void> {
  if (queueWorkerRunning) {
    return;
  }

  queueWorkerRunning = true;
  try {
    while (pendingJobs.size > 0) {
      const concurrency = queueConcurrency;
      const batch = Array.from(pendingJobs.values()).slice(0, concurrency);
      for (const job of batch) {
        pendingJobs.delete(job.signature);
      }

      const batchOptions = batch[0]?.options;
      const databaseId = batchOptions?.databaseId ?? "(default)";
      await Promise.all(
        batch.map((job) =>
          ensureSingleFirestoreIndex(job.index, job.options, databaseId, {
            forceRetry: job.forceRetry,
          }),
        ),
      );

      if (pendingJobs.size > 0) {
        const delayMs = batchOptions
          ? resolveBatchDelayMs(batchOptions)
          : queueBatchDelayMs;
        if (delayMs > 0) {
          await sleep(delayMs);
        }
      }
    }
  } finally {
    queueWorkerRunning = false;
    if (pendingJobs.size > 0) {
      void drainIndexProvisioningQueue();
    }
  }
}

async function shouldSkipIndexProvisioning(
  index: FirestoreCompositeIndex,
  options: EnsureFirestoreIndexesOptions,
  forceRetry: boolean,
): Promise<boolean> {
  if (forceRetry || !options.statusStore) {
    return false;
  }

  const signature = computeIndexSignature(index);
  const existing = await options.statusStore.getBySignature(signature);
  if (!existing) {
    return false;
  }

  if (
    existing.status === "READY" ||
    existing.status === "CREATING" ||
    existing.status === "ERROR"
  ) {
    return true;
  }

  return false;
}

async function markPermanentFailure(
  index: FirestoreCompositeIndex,
  options: EnsureFirestoreIndexesOptions,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await options.statusStore?.markError(index, message, {
    retryExhausted: true,
  });
  await options.onProvisionEvent?.({
    event: "error",
    index,
    tenantId: options.provisionTenantId,
    trigger: options.provisionTrigger,
    errorMessage: message,
    retryExhausted: true,
  });
  options.onError?.(error, index);
}

interface IndexCreateOperation {
  readonly name?: string;
  promise: () => Promise<unknown>;
}

type CreateIndexResult =
  | { readonly kind: "already_exists" }
  | {
      readonly kind: "operation";
      readonly operation: IndexCreateOperation;
      readonly operationName?: string;
    };

async function createIndexWithTransientRetry(
  index: FirestoreCompositeIndex,
  options: EnsureFirestoreIndexesOptions,
  databaseId: string,
): Promise<CreateIndexResult> {
  const parent = getAdminClient().collectionGroupPath(
    options.projectId,
    databaseId,
    index.collectionGroup,
  );

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
    try {
      const [operation] = await getAdminClient().createIndex({
        parent,
        index: {
          queryScope: index.queryScope,
          fields: toAdminIndexFields(index.fields) as never,
        },
      });
      const indexOperation = operation as IndexCreateOperation;
      const operationName =
        indexOperation.name ??
        (operation as { latestResponse?: { name?: string } }).latestResponse
          ?.name;
      return { kind: "operation", operation: indexOperation, operationName };
    } catch (error) {
      lastError = error;
      if (isAlreadyExistsError(error)) {
        return { kind: "already_exists" };
      }
      if (!isTransientAdminError(error) || attempt >= MAX_TRANSIENT_RETRIES) {
        throw error;
      }
      await sleep(TRANSIENT_RETRY_BASE_MS * 2 ** attempt);
    }
  }

  throw lastError;
}

async function ensureSingleFirestoreIndex(
  index: FirestoreCompositeIndex,
  options: EnsureFirestoreIndexesOptions,
  databaseId: string,
  execution: { readonly forceRetry: boolean },
): Promise<void> {
  if (await shouldSkipIndexProvisioning(index, options, execution.forceRetry)) {
    return;
  }

  try {
    const createResult = await createIndexWithTransientRetry(
      index,
      options,
      databaseId,
    );

    if (createResult.kind === "already_exists") {
      await options.statusStore?.markReady(index);
      await options.onProvisionEvent?.({
        event: "ready",
        index,
        tenantId: options.provisionTenantId,
        trigger: options.provisionTrigger,
      });
      return;
    }

    const { operation, operationName } = createResult;
    await options.statusStore?.upsertCreating(index, operationName);
    await options.onProvisionEvent?.({
      event: "creating",
      index,
      tenantId: options.provisionTenantId,
      trigger: options.provisionTrigger,
      operationName,
    });
    options.onEnsured?.(index);

    void operation
      .promise()
      .then(async () => {
        await options.statusStore?.markReady(index);
        await options.onProvisionEvent?.({
          event: "ready",
          index,
          tenantId: options.provisionTenantId,
          trigger: options.provisionTrigger,
        });
      })
      .catch(async (error: unknown) => {
        if (isAlreadyExistsError(error)) {
          await options.statusStore?.markReady(index);
          await options.onProvisionEvent?.({
            event: "ready",
            index,
            tenantId: options.provisionTenantId,
            trigger: options.provisionTrigger,
          });
          return;
        }
        await markPermanentFailure(index, options, error);
      });
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      await options.statusStore?.markReady(index);
      await options.onProvisionEvent?.({
        event: "ready",
        index,
        tenantId: options.provisionTenantId,
        trigger: options.provisionTrigger,
      });
      return;
    }
    await markPermanentFailure(index, options, error);
  }
}

export async function ensureFirestoreIndexes(
  indexes: readonly FirestoreCompositeIndex[],
  options: EnsureFirestoreIndexesOptions,
): Promise<void> {
  if (indexes.length === 0) {
    return;
  }

  for (const index of indexes) {
    await options.onProvisionEvent?.({
      event: "ensure_requested",
      index,
      tenantId: options.provisionTenantId,
      trigger: options.provisionTrigger,
    });
  }

  enqueueIndexes(indexes, options, options.forceRetry === true);

  while (pendingJobs.size > 0 || queueWorkerRunning) {
    await sleep(25);
  }
}

export async function ensureEntityFirestoreIndexes(
  entity: AnyDefinedEntity,
  options: EnsureFirestoreIndexesOptions,
): Promise<void> {
  const indexes = indexesForEntity(entity);
  await ensureFirestoreIndexes(indexes, options);
}

export function scheduleEnsureEntityFirestoreIndexes(
  entity: AnyDefinedEntity,
  options: EnsureFirestoreIndexesOptions,
): void {
  const indexes = indexesForEntity(entity);
  if (indexes.length === 0) {
    return;
  }

  for (const index of indexes) {
    void options.onProvisionEvent?.({
      event: "ensure_requested",
      index,
      tenantId: options.provisionTenantId,
      trigger: options.provisionTrigger,
    });
  }

  enqueueIndexes(indexes, options, options.forceRetry === true);
}

export function scheduleEnsureFirestoreIndexes(
  indexes: readonly FirestoreCompositeIndex[],
  options: EnsureFirestoreIndexesOptions,
): void {
  if (indexes.length === 0) {
    return;
  }

  for (const index of indexes) {
    void options.onProvisionEvent?.({
      event: "ensure_requested",
      index,
      tenantId: options.provisionTenantId,
      trigger: options.provisionTrigger,
    });
  }

  enqueueIndexes(indexes, options, options.forceRetry === true);
}

export function scheduleEnsureFirestoreIndexesFromHint(
  hint: FirestoreIndexHint,
  options: EnsureFirestoreIndexesOptions,
): void {
  scheduleEnsureFirestoreIndexes([buildIndexFromHint(hint)], options);
}

/** @internal Exposed for unit tests. */
export function resetIndexProvisioningQueueForTests(): void {
  pendingJobs.clear();
  queueWorkerRunning = false;
  queueConcurrency = DEFAULT_ENSURE_CONCURRENCY;
  queueBatchDelayMs = DEFAULT_BATCH_DELAY_MS;
}

/** @internal Exposed for unit tests. */
export function getIndexProvisioningQueueStateForTests(): {
  readonly pendingCount: number;
  readonly running: boolean;
} {
  return {
    pendingCount: pendingJobs.size,
    running: queueWorkerRunning,
  };
}
