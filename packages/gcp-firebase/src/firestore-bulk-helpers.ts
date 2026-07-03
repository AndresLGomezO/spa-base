import type {
  BulkWriter,
  DocumentReference,
  Firestore,
} from "firebase-admin/firestore";

export const FIRESTORE_BATCH_LIMIT = 500;

export const BULK_WRITER_MAX_RETRY_ATTEMPTS = 5;

export async function commitBatchDeletes(
  docRefs: readonly DocumentReference[],
): Promise<void> {
  const firestore = docRefs[0]?.firestore;
  if (!firestore || docRefs.length === 0) {
    return;
  }

  for (let index = 0; index < docRefs.length; index += FIRESTORE_BATCH_LIMIT) {
    const batch = firestore.batch();
    for (const docRef of docRefs.slice(index, index + FIRESTORE_BATCH_LIMIT)) {
      batch.delete(docRef);
    }
    await batch.commit();
  }
}

export interface CreateBulkWriterOptions {
  readonly onWriteSuccess?: () => void;
  readonly maxRetryAttempts?: number;
}

export function createBulkWriterWithRetry(
  firestore: Firestore,
  options?: CreateBulkWriterOptions,
): BulkWriter {
  const bulkWriter = firestore.bulkWriter();
  const maxRetries =
    options?.maxRetryAttempts ?? BULK_WRITER_MAX_RETRY_ATTEMPTS;

  bulkWriter.onWriteError((error) => error.failedAttempts < maxRetries);

  if (options?.onWriteSuccess) {
    const onWriteSuccess = options.onWriteSuccess;
    bulkWriter.onWriteResult(() => {
      onWriteSuccess();
    });
  }

  return bulkWriter;
}

export interface ThrottledProgressDelta {
  readonly collectionsCopied?: number;
  readonly docsCopied?: number;
  readonly docsDeleted?: number;
}

export interface ThrottledProgressReporterOptions {
  readonly flushEveryDocs?: number;
  readonly flushEveryMs?: number;
}

export interface ThrottledProgressReporter {
  report(delta: ThrottledProgressDelta): void;
  flush(): Promise<void>;
  close(): Promise<void>;
}

function mergeProgressDelta(
  target: ThrottledProgressDelta,
  delta: ThrottledProgressDelta,
): ThrottledProgressDelta {
  const merged = {
    collectionsCopied:
      (target.collectionsCopied ?? 0) + (delta.collectionsCopied ?? 0),
    docsCopied: (target.docsCopied ?? 0) + (delta.docsCopied ?? 0),
    docsDeleted: (target.docsDeleted ?? 0) + (delta.docsDeleted ?? 0),
  };

  const result: {
    collectionsCopied?: number;
    docsCopied?: number;
    docsDeleted?: number;
  } = {};
  if (merged.collectionsCopied > 0) {
    result.collectionsCopied = merged.collectionsCopied;
  }
  if (merged.docsCopied > 0) {
    result.docsCopied = merged.docsCopied;
  }
  if (merged.docsDeleted > 0) {
    result.docsDeleted = merged.docsDeleted;
  }
  return result;
}

function countDocumentProgress(delta: ThrottledProgressDelta): number {
  return (delta.docsCopied ?? 0) + (delta.docsDeleted ?? 0);
}

function hasPendingProgress(delta: ThrottledProgressDelta): boolean {
  return (
    (delta.collectionsCopied ?? 0) > 0 ||
    (delta.docsCopied ?? 0) > 0 ||
    (delta.docsDeleted ?? 0) > 0
  );
}

export function createThrottledProgressReporter(
  onFlush: (delta: ThrottledProgressDelta) => void | Promise<void>,
  options?: ThrottledProgressReporterOptions,
): ThrottledProgressReporter {
  const flushEveryDocs = options?.flushEveryDocs ?? 500;
  const flushEveryMs = options?.flushEveryMs ?? 3000;

  let pending: ThrottledProgressDelta = {};
  let pendingDocCount = 0;
  let lastFlushTime = Date.now();
  let flushPromise: Promise<void> | null = null;

  const doFlush = async (): Promise<void> => {
    if (!hasPendingProgress(pending)) {
      return;
    }

    const toFlush = pending;
    pending = {};
    pendingDocCount = 0;
    lastFlushTime = Date.now();
    await onFlush(toFlush);
  };

  const reporter: ThrottledProgressReporter = {
    report(delta: ThrottledProgressDelta) {
      pending = mergeProgressDelta(pending, delta);
      pendingDocCount += countDocumentProgress(delta);

      const elapsedMs = Date.now() - lastFlushTime;
      if (pendingDocCount >= flushEveryDocs || elapsedMs >= flushEveryMs) {
        void reporter.flush();
      }
    },

    async flush() {
      if (!flushPromise) {
        flushPromise = doFlush().finally(() => {
          flushPromise = null;
        });
      }
      await flushPromise;
    },

    async close() {
      await reporter.flush();
    },
  };

  return reporter;
}
