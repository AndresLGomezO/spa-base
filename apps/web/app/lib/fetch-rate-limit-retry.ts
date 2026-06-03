const MAX_RATE_LIMIT_ATTEMPTS = 4;
const MAX_RETRY_DELAY_MS = 15_000;

export function parseRateLimitRetryDelayMs(
  status: number,
  message: string,
  attempt: number,
): number | null {
  if (status !== 429) {
    return null;
  }

  const secondsMatch = /retry in (\d+)\s*seconds?/i.exec(message);
  if (secondsMatch?.[1]) {
    return Math.min(Number(secondsMatch[1]) * 1000, MAX_RETRY_DELAY_MS);
  }

  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchWithRateLimitRetry(
  input: URL,
  init: RequestInit,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < MAX_RATE_LIMIT_ATTEMPTS; attempt += 1) {
    const response = await fetch(input, init);
    lastResponse = response;

    if (response.status !== 429 || attempt === MAX_RATE_LIMIT_ATTEMPTS - 1) {
      return response;
    }

    let message = "";
    try {
      const payload = (await response.clone().json()) as {
        readonly error?: { readonly message?: string };
        readonly message?: string;
      };
      message = payload.error?.message ?? payload.message ?? "";
    } catch {
      message = "";
    }

    const delayMs =
      parseRateLimitRetryDelayMs(response.status, message, attempt) ?? 1000;
    await sleep(delayMs);
  }

  return lastResponse!;
}
