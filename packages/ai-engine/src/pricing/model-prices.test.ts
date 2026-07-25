import { describe, expect, it } from "vitest";

import { estimateCostUsd, withEstimatedCost } from "./model-prices.js";

describe("estimateCostUsd", () => {
  it("computes Flash cost with cached tokens", () => {
    const result = estimateCostUsd("gemini-3.6-flash", {
      promptTokens: 1_000_000,
      candidatesTokens: 100_000,
      cachedContentTokens: 200_000,
    });
    // (800k * 0.5 + 100k * 3.0 + 200k * 0.05) / 1M = 0.4 + 0.3 + 0.01 = 0.71
    expect(result).toEqual({
      estimatedCostUsd: 0.71,
      costTier: "standard",
    });
  });

  it("applies Pro standard tier at or below 200K prompt tokens", () => {
    const result = estimateCostUsd("gemini-3.1-pro-preview", {
      promptTokens: 200_000,
      candidatesTokens: 10_000,
    });
    // (200k * 2.0 + 10k * 12.0) / 1M = 0.4 + 0.12 = 0.52
    expect(result).toEqual({
      estimatedCostUsd: 0.52,
      costTier: "standard",
    });
  });

  it("switches Pro to long-context rates above 200K prompt tokens", () => {
    const result = estimateCostUsd("gemini-3.1-pro-preview", {
      promptTokens: 200_001,
      candidatesTokens: 10_000,
    });
    // (200001 * 4.0 + 10000 * 18.0) / 1M
    expect(result.costTier).toBe("longContext");
    expect(result.estimatedCostUsd).toBeCloseTo(0.980004, 6);
  });

  it("estimates embedding cost from promptTokens", () => {
    const result = estimateCostUsd("text-embedding-005", {
      promptTokens: 1_000_000,
    });
    expect(result).toEqual({ estimatedCostUsd: 0.1 });
  });

  it("estimates embedding cost from inputCharacters when tokens missing", () => {
    const result = estimateCostUsd("text-embedding-005", {
      inputCharacters: 4000,
    });
    // ceil(4000/4) = 1000 tokens → 1000/1M * 0.1 = 0.0001
    expect(result).toEqual({ estimatedCostUsd: 0.0001 });
  });

  it("estimates Imagen cost per image", () => {
    const result = estimateCostUsd("imagen-3.0-generate-002", {
      imageCount: 2,
    });
    expect(result).toEqual({ estimatedCostUsd: 0.08 });
  });

  it("returns empty object for unknown model ids", () => {
    expect(estimateCostUsd("unknown-model", { promptTokens: 100 })).toEqual({});
  });

  it("withEstimatedCost merges cost fields onto usage", () => {
    const usage = withEstimatedCost({
      modelId: "gemini-3.6-flash",
      promptTokens: 1_000,
      candidatesTokens: 500,
      totalTokens: 1_500,
    });
    expect(usage.modelId).toBe("gemini-3.6-flash");
    expect(usage.estimatedCostUsd).toBeCloseTo(0.002, 6);
    expect(usage.costTier).toBe("standard");
  });
});
