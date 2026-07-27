import type { DataHookAiRequest } from "@repo/hooks";

type CallAiFn = (
  request: DataHookAiRequest,
) => Promise<Record<string, unknown>>;

type PendingEntry = {
  readonly request: DataHookAiRequest;
  readonly resolve: (value: Record<string, unknown>) => void;
  readonly reject: (error: unknown) => void;
};

/**
 * Batches and memoizes `callAi` within a schedule tick.
 * Identical `cacheKey` values share one result; distinct keys are flushed in
 * chunks of `batchSize` via a single multi-item Vertex prompt when possible.
 */
export function createBatchedCallAi(options: {
  readonly callAi: CallAiFn;
  readonly batchSize: number;
  readonly batchCallAi?: (
    requests: readonly DataHookAiRequest[],
  ) => Promise<readonly Record<string, unknown>[]>;
}): {
  readonly callAi: CallAiFn;
  readonly flush: () => Promise<void>;
} {
  const batchSize = Math.max(1, Math.min(50, options.batchSize));
  const memo = new Map<string, Promise<Record<string, unknown>>>();
  let pending: PendingEntry[] = [];
  let flushing: Promise<void> = Promise.resolve();

  async function flushChunk(chunk: readonly PendingEntry[]): Promise<void> {
    if (chunk.length === 0) {
      return;
    }
    if (chunk.length === 1 || !options.batchCallAi) {
      await Promise.all(
        chunk.map(async (entry) => {
          try {
            const result = await options.callAi(entry.request);
            entry.resolve(result);
          } catch (error) {
            entry.reject(error);
          }
        }),
      );
      return;
    }
    try {
      const results = await options.batchCallAi(
        chunk.map((entry) => entry.request),
      );
      chunk.forEach((entry, index) => {
        const result = results[index];
        if (result) {
          entry.resolve(result);
        } else {
          entry.reject(
            new Error(`batched callAi returned no result for item ${index}.`),
          );
        }
      });
    } catch (error) {
      for (const entry of chunk) {
        entry.reject(error);
      }
    }
  }

  async function flush(): Promise<void> {
    const queue = pending;
    pending = [];
    for (let i = 0; i < queue.length; i += batchSize) {
      await flushChunk(queue.slice(i, i + batchSize));
    }
  }

  function scheduleFlush(): void {
    flushing = flushing.then(flush).catch(async (error) => {
      // Surface flush failures to pending waiters on next flush.
      throw error;
    });
  }

  const callAi: CallAiFn = (request) => {
    const key =
      request.cacheKey?.trim() || `__anon_${pending.length}_${Date.now()}`;
    const existing = memo.get(key);
    if (existing) {
      return existing;
    }

    const promise = new Promise<Record<string, unknown>>((resolve, reject) => {
      pending.push({ request, resolve, reject });
      // Flush when full. Also schedule a microtask drain so a chunk where
      // fewer than batchSize records call callAi cannot deadlock the
      // schedule-tick loop (it awaits the chunk before the explicit flush).
      if (pending.length >= batchSize) {
        scheduleFlush();
      } else {
        queueMicrotask(() => {
          if (pending.length > 0) {
            scheduleFlush();
          }
        });
      }
    });
    memo.set(key, promise);
    return promise;
  };

  return {
    callAi,
    flush: async () => {
      scheduleFlush();
      await flushing;
      // Drain any stragglers added during flush.
      while (pending.length > 0) {
        scheduleFlush();
        await flushing;
      }
    },
  };
}
