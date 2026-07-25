import { afterEach, describe, expect, it, vi } from "vitest";

import { createDebouncedUserAiMemoryRefreshScheduler } from "./debounced-user-ai-memory-refresh.js";

describe("createDebouncedUserAiMemoryRefreshScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("collapses multiple schedules into one enqueue after delay", async () => {
    vi.useFakeTimers();
    const enqueue = vi.fn(async () => undefined);
    const scheduler = createDebouncedUserAiMemoryRefreshScheduler({
      delayMs: 1000,
      enqueue,
    });

    scheduler.schedule({ tenantId: "t1", userId: "u1" });
    scheduler.schedule({ tenantId: "t1", userId: "u1" });
    scheduler.schedule({ tenantId: "t1", userId: "u1" });
    expect(enqueue).not.toHaveBeenCalled();
    expect(scheduler.pendingCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith({ tenantId: "t1", userId: "u1" });
    expect(scheduler.pendingCount()).toBe(0);
  });
});
