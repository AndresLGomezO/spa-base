import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchWithRateLimitRetry,
  parseRateLimitRetryDelayMs,
} from "./fetch-rate-limit-retry";

describe("parseRateLimitRetryDelayMs", () => {
  it("parses retry delay from rate limit message", () => {
    expect(
      parseRateLimitRetryDelayMs(
        429,
        "Rate limit exceeded, retry in 7 seconds",
        0,
      ),
    ).toBe(7000);
  });
});

describe("fetchWithRateLimitRetry", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries after 429 and returns the successful response", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 429,
        clone: () => ({
          json: async () => ({
            error: { message: "Rate limit exceeded, retry in 1 seconds" },
          }),
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        clone: () => ({
          json: async () => ({ data: true }),
        }),
      });

    const promise = fetchWithRateLimitRetry(
      new URL("http://127.0.0.1:3000/api/entities"),
      { method: "GET" },
    );

    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
