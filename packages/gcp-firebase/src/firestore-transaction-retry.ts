import type { Firestore, Transaction } from "firebase-admin/firestore";

export function isFirestoreTransactionContentionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  if (code === 10 || code === "ABORTED") {
    return true;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  const normalized = message.toLowerCase();
  return (
    normalized.includes("cross-transaction contention") ||
    normalized.includes("too much contention") ||
    normalized.includes("transaction lock timeout") ||
    normalized.includes("aborted")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface RunFirestoreTransactionWithRetryOptions {
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
}

export async function runFirestoreTransactionWithRetry<T>(
  firestore: Firestore,
  updateFunction: (transaction: Transaction) => Promise<T>,
  options: RunFirestoreTransactionWithRetryOptions = {},
): Promise<T> {
  // Email backfill and cascading aggregate hooks often hit the same parents.
  // Give contention more room than Firestore's short internal retry window.
  const maxAttempts = options.maxAttempts ?? 8;
  const baseDelayMs = options.baseDelayMs ?? 100;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await firestore.runTransaction(updateFunction);
    } catch (error) {
      lastError = error;
      if (
        !isFirestoreTransactionContentionError(error) ||
        attempt === maxAttempts - 1
      ) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * baseDelayMs);
      await sleep(baseDelayMs * 2 ** attempt + jitter);
    }
  }

  throw lastError;
}
