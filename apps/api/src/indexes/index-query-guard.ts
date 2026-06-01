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

export async function assertCollectionIndexesReady(
  statusStore: FirestoreIndexStatusStore | undefined,
  collection: string,
): Promise<void> {
  if (!statusStore) {
    return;
  }
  const creating = await statusStore.hasCreating(collection);
  if (creating) {
    throw new IndexCreatingError(collection);
  }
}
