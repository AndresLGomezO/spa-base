import { describe, expect, it } from "vitest";

import { redactForPrompt } from "./redact-for-prompt.js";

describe("redactForPrompt", () => {
  it("strips embeddings and search mirrors", () => {
    const result = redactForPrompt({
      record: {
        id: "1",
        name: "Acme",
        embedding: [0.1, 0.2],
        aiSummaryEmbedding: [0.3],
        nameSearchTokens: ["acme"],
        tenantId: "t1",
      },
    });

    expect(result).toEqual({ id: "1", name: "Acme" });
  });

  it("applies piiLevel masking and exclusion", () => {
    const result = redactForPrompt({
      record: {
        id: "1",
        ssn: "123-45-6789",
        email: "a@b.com",
        name: "Ada",
      },
      piiLevel: {
        ssn: "excluded",
        email: "masked",
        name: "public",
      },
    });

    expect(result.ssn).toBeUndefined();
    expect(result.email).toBe("a@***m");
    expect(result.name).toBe("Ada");
  });

  it("drops fields with RBAC access none", () => {
    const result = redactForPrompt({
      record: { id: "1", secret: "x", name: "Ada" },
      fieldAccessMap: { secret: "none", name: "read", id: "read" },
    });

    expect(result).toEqual({ id: "1", name: "Ada" });
  });
});
