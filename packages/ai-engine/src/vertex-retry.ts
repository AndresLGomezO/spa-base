export const VERTEX_MAX_RETRIES = 5;
export const VERTEX_MAX_RETRY_DELAY_MS = 60_000;

export const VERTEX_RATE_LIMIT_ERROR_MESSAGE =
  "Vertex AI rate limit exceeded. Please wait a moment and try again.";

const RATE_LIMIT_PATTERNS = [
  /429/i,
  /resource_exhausted/i,
  /too many requests/i,
  /resource exhausted/i,
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

export function isVertexRateLimitError(error: unknown): boolean {
  const message = errorMessage(error);
  return RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(message));
}

export function parseVertexRetryDelayMs(
  error: unknown,
  attempt: number,
): number {
  const message = errorMessage(error);
  const secondsMatch = /retry in (\d+)\s*seconds?/i.exec(message);
  if (secondsMatch?.[1]) {
    return Math.min(Number(secondsMatch[1]) * 1000, VERTEX_MAX_RETRY_DELAY_MS);
  }

  const baseDelay = Math.min(1000 * 2 ** attempt, VERTEX_MAX_RETRY_DELAY_MS);
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(baseDelay + jitter, VERTEX_MAX_RETRY_DELAY_MS);
}

export function normalizeVertexError(error: unknown): string {
  if (isVertexRateLimitError(error)) {
    return VERTEX_RATE_LIMIT_ERROR_MESSAGE;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return errorMessage(error);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
