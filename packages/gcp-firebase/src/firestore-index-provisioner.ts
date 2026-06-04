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
}

const ensuredSignatures = new Set<string>();
const DEFAULT_ENSURE_CONCURRENCY = 5;

async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const current = items[nextIndex];
        nextIndex += 1;
        if (current === undefined) {
          continue;
        }
        await worker(current);
      }
    },
  );

  await Promise.all(workers);
}

async function ensureSingleFirestoreIndex(
  index: FirestoreCompositeIndex,
  options: EnsureFirestoreIndexesOptions,
  databaseId: string,
): Promise<void> {
  const signature = computeIndexSignature(index);
  if (ensuredSignatures.has(signature)) {
    return;
  }
  ensuredSignatures.add(signature);

  const parent = getAdminClient().collectionGroupPath(
    options.projectId,
    databaseId,
    index.collectionGroup,
  );

  try {
    const [operation] = await getAdminClient().createIndex({
      parent,
      index: {
        queryScope: index.queryScope,
        fields: toAdminIndexFields(index.fields) as never,
      },
    });
    const operationName =
      operation.name ??
      (operation as { latestResponse?: { name?: string } }).latestResponse
        ?.name;
    await options.statusStore?.upsertCreating(index, operationName);
    options.onEnsured?.(index);
    void operation
      .promise()
      .then(async () => {
        await options.statusStore?.markReady(index);
      })
      .catch(async (error: unknown) => {
        if (isAlreadyExistsError(error)) {
          await options.statusStore?.markReady(index);
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        await options.statusStore?.markError(index, message);
        options.onError?.(error, index);
      });
  } catch (error) {
    ensuredSignatures.delete(signature);
    if (isAlreadyExistsError(error)) {
      ensuredSignatures.add(signature);
      await options.statusStore?.markReady(index);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    await options.statusStore?.markError(index, message);
    options.onError?.(error, index);
  }
}

export async function ensureFirestoreIndexes(
  indexes: readonly FirestoreCompositeIndex[],
  options: EnsureFirestoreIndexesOptions,
): Promise<void> {
  const databaseId = options.databaseId ?? "(default)";
  const concurrency = options.concurrency ?? DEFAULT_ENSURE_CONCURRENCY;

  await runWithConcurrency(indexes, concurrency, async (index) => {
    await ensureSingleFirestoreIndex(index, options, databaseId);
  });
}

export async function ensureEntityFirestoreIndexes(
  entity: AnyDefinedEntity,
  options: EnsureFirestoreIndexesOptions,
): Promise<void> {
  const indexes = indexesForEntity(entity);
  if (indexes.length === 0) {
    return;
  }
  await ensureFirestoreIndexes(indexes, options);
}

export function scheduleEnsureEntityFirestoreIndexes(
  entity: AnyDefinedEntity,
  options: EnsureFirestoreIndexesOptions,
): void {
  void ensureEntityFirestoreIndexes(entity, options);
}

export function scheduleEnsureFirestoreIndexesFromHint(
  hint: FirestoreIndexHint,
  options: EnsureFirestoreIndexesOptions,
): void {
  void ensureFirestoreIndexes([buildIndexFromHint(hint)], options);
}
