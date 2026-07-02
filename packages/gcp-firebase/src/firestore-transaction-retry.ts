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

  return (
    message.includes("cross-transaction contention") ||
    message.includes("ABORTED")
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
  const maxAttempts = options.maxAttempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 50;
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
