import { describe, expect, it } from "vitest";

import {
  buildMockTextEmbedding,
  cosineSimilarity,
  generateTextEmbedding,
  pickBestEmbeddingMatch,
  readEmbeddingField,
} from "./text-embedding.js";

describe("text-embedding", () => {
  it("buildMockTextEmbedding is deterministic and L2-normalized", () => {
    const a = buildMockTextEmbedding("UBER TRIP HELP");
    const b = buildMockTextEmbedding("UBER TRIP HELP");
    expect(a).toEqual(b);
    const norm = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("similar merchant texts score higher than unrelated ones", () => {
    const uberA = buildMockTextEmbedding("UBER TRIP HELP COP");
    const uberB = buildMockTextEmbedding("UBER TRIP HELP MXN");
    const rappi = buildMockTextEmbedding("RAPPI ORDER FOOD");
    expect(cosineSimilarity(uberA, uberB)).toBeGreaterThan(
      cosineSimilarity(uberA, rappi),
    );
    expect(cosineSimilarity(uberA, uberB)).toBeGreaterThan(0.5);
  });

  it("generateTextEmbedding uses mock when mockEnabled", async () => {
    const values = await generateTextEmbedding(
      {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-2.5-flash",
        mockEnabled: true,
      },
      "UBER TRIP",
    );
    expect(values).toEqual(buildMockTextEmbedding("UBER TRIP"));
  });

  it("pickBestEmbeddingMatch returns null below threshold", () => {
    const query = buildMockTextEmbedding("UBER TRIP");
    const candidates = [
      {
        id: "1",
        embedding: buildMockTextEmbedding("RAPPI FOOD"),
      },
    ];
    expect(
      pickBestEmbeddingMatch({
        query,
        candidates,
        embeddingField: "embedding",
        minScore: 0.99,
      }),
    ).toBeNull();
  });

  it("pickBestEmbeddingMatch returns the closest candidate", () => {
    const query = buildMockTextEmbedding("UBER TRIP HELP");
    const candidates = [
      {
        id: "rappi",
        embedding: buildMockTextEmbedding("RAPPI FOOD"),
      },
      {
        id: "uber",
        embedding: buildMockTextEmbedding("UBER TRIP HELP COP"),
      },
    ];
    const best = pickBestEmbeddingMatch({
      query,
      candidates,
      embeddingField: "embedding",
      minScore: 0.3,
    });
    expect(best?.record.id).toBe("uber");
    expect(best!.score).toBeGreaterThan(0.3);
  });

  it("readEmbeddingField rejects non-numeric arrays", () => {
    expect(readEmbeddingField({ embedding: [1, "x"] }, "embedding")).toBeNull();
    expect(readEmbeddingField({ embedding: [0.1, 0.2] }, "embedding")).toEqual([
      0.1, 0.2,
    ]);
  });
});
