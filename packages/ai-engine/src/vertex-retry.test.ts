import { describe, expect, it } from "vitest";

import {
  isVertexRateLimitError,
  normalizeVertexError,
  parseVertexRetryDelayMs,
  VERTEX_RATE_LIMIT_ERROR_MESSAGE,
} from "./vertex-retry.js";

describe("isVertexRateLimitError", () => {
  it("detects 429 ClientError messages", () => {
    expect(
      isVertexRateLimitError(
        new Error(
          '[VertexAI.ClientError]: got status: 429 Too Many Requests. {"error":{"code":429,"message":"Resource exhausted.","status":"RESOURCE_EXHAUSTED"}}',
        ),
      ),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isVertexRateLimitError(new Error("Network timeout"))).toBe(false);
  });
});

describe("parseVertexRetryDelayMs", () => {
  it("parses retry delay from rate limit message", () => {
    expect(
      parseVertexRetryDelayMs(
        new Error("Rate limit exceeded, retry in 7 seconds"),
        0,
      ),
    ).toBe(7000);
  });

  it("uses exponential backoff when no retry hint is present", () => {
    const delay = parseVertexRetryDelayMs(
      new Error("429 Too Many Requests"),
      2,
    );
    expect(delay).toBeGreaterThanOrEqual(4000);
    expect(delay).toBeLessThanOrEqual(4250);
  });
});

describe("normalizeVertexError", () => {
  it("maps rate limit errors to a friendly message", () => {
    expect(
      normalizeVertexError(
        new Error("429 Too Many Requests RESOURCE_EXHAUSTED"),
      ),
    ).toBe(VERTEX_RATE_LIMIT_ERROR_MESSAGE);
  });

  it("preserves non-rate-limit error messages", () => {
    expect(normalizeVertexError(new Error("Invalid API key"))).toBe(
      "Invalid API key",
    );
  });
});
