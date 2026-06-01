import type { FirestoreIndexStatusStore } from "@repo/gcp-firebase";

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

export async function assertCollectionIndexesReady(
  statusStore: FirestoreIndexStatusStore | undefined,
  collection: string,
): Promise<void> {
  if (!statusStore) {
    return;
  }

  const failed = await statusStore.getFailedRecords(collection);
  if (failed.length > 0) {
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
    throw new IndexCreatingError(collection);
  }
}
