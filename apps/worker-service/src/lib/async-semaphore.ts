/**
 * Limits how many async tasks run at once. Extra callers wait in FIFO order.
 * Used to serialize Gmail process-message work so email hooks do not contend
 * on the same parent entity documents during window-sync fan-out.
 */
export function createAsyncSemaphore(limit: number) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Async semaphore limit must be a positive integer.");
  }

  let active = 0;
  const waiters: Array<() => void> = [];

  async function acquire(): Promise<void> {
    if (active < limit) {
      active += 1;
      return;
    }
    await new Promise<void>((resolve) => {
      waiters.push(resolve);
    });
  }

  function release(): void {
    const next = waiters.shift();
    if (next) {
      // Transfer the occupied slot to the next waiter.
      next();
      return;
    }
    active -= 1;
  }

  async function run<T>(task: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  }

  return { run };
}
