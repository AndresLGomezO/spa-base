/**
 * Debounced per-user AI memory refresh scheduler (5-minute window by default).
 * Collapses bursty record writes into a single refresh.
 */
export function createDebouncedUserAiMemoryRefreshScheduler(options: {
  readonly delayMs?: number;
  readonly enqueue: (input: {
    readonly tenantId: string;
    readonly userId: string;
  }) => Promise<void>;
  readonly now?: () => number;
}): {
  schedule(input: { readonly tenantId: string; readonly userId: string }): void;
  flush(): Promise<void>;
  pendingCount(): number;
} {
  const delayMs = options.delayMs ?? 5 * 60 * 1000;
  const now = options.now ?? (() => Date.now());
  const pending = new Map<
    string,
    {
      readonly tenantId: string;
      readonly userId: string;
      timer: NodeJS.Timeout;
    }
  >();

  function key(tenantId: string, userId: string): string {
    return `${tenantId}::${userId}`;
  }

  return {
    schedule(input) {
      const k = key(input.tenantId, input.userId);
      const existing = pending.get(k);
      if (existing) {
        clearTimeout(existing.timer);
      }
      const timer = setTimeout(() => {
        pending.delete(k);
        void options.enqueue(input).catch((error) => {
          console.error(
            JSON.stringify({
              severity: "ERROR",
              message: "ai.memory.refresh.enqueue_failed",
              tenantId: input.tenantId,
              userId: input.userId,
              error: error instanceof Error ? error.message : String(error),
              at: new Date(now()).toISOString(),
            }),
          );
        });
      }, delayMs);
      // Don't keep the process alive solely for debounce timers in tests.
      timer.unref?.();
      pending.set(k, { ...input, timer });
    },
    async flush() {
      const entries = [...pending.values()];
      pending.clear();
      for (const entry of entries) {
        clearTimeout(entry.timer);
        await options.enqueue({
          tenantId: entry.tenantId,
          userId: entry.userId,
        });
      }
    },
    pendingCount() {
      return pending.size;
    },
  };
}
