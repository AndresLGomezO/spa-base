import { describe, expect, it, vi } from "vitest";

import {
  isFirestoreTransactionContentionError,
  runFirestoreTransactionWithRetry,
} from "./firestore-transaction-retry.js";

describe("firestore-transaction-retry", () => {
  it("detects ABORTED contention errors", () => {
    expect(
      isFirestoreTransactionContentionError({
        code: 10,
        message:
          "Aborted due to cross-transaction contention. This occurs when multiple transactions attempt to access the same data, requiring Firestore to abort at least one in order to enforce serializability.",
      }),
    ).toBe(true);
    expect(
      isFirestoreTransactionContentionError(
        new Error("10 ABORTED: Transaction lock timeout."),
      ),
    ).toBe(true);
    expect(
      isFirestoreTransactionContentionError(
        new Error("Too much contention on these documents. Please try again."),
      ),
    ).toBe(true);
    expect(
      isFirestoreTransactionContentionError(new Error("ABORTED: other")),
    ).toBe(true);
    expect(isFirestoreTransactionContentionError(new Error("not found"))).toBe(
      false,
    );
  });

  it("retries transaction work after contention", async () => {
    const firestore = {
      runTransaction: vi
        .fn()
        .mockRejectedValueOnce({ code: 10, message: "ABORTED contention" })
        .mockResolvedValueOnce("ok"),
    };

    const result = await runFirestoreTransactionWithRetry(
      firestore as never,
      async () => "ok",
      { maxAttempts: 3, baseDelayMs: 0 },
    );

    expect(result).toBe("ok");
    expect(firestore.runTransaction).toHaveBeenCalledTimes(2);
  });

  it("rethrows non-contention errors immediately", async () => {
    const firestore = {
      runTransaction: vi.fn().mockRejectedValue(new Error("permission denied")),
    };

    await expect(
      runFirestoreTransactionWithRetry(firestore as never, async () => "ok"),
    ).rejects.toThrow("permission denied");
    expect(firestore.runTransaction).toHaveBeenCalledTimes(1);
  });
});
