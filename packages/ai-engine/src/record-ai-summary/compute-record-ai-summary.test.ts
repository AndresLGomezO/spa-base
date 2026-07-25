import { describe, expect, it } from "vitest";

import { computeRecordAiSummary } from "./compute-record-ai-summary.js";

const template = {
  textTemplate: "{{name}} <{{email}}> {{secret}}",
  jsonFields: ["name", "email", "secret"],
  embeddingFields: [],
  piiLevel: {
    email: "masked" as const,
    secret: "excluded" as const,
  },
};

describe("computeRecordAiSummary", () => {
  it("interpolates fields and enforces PII policy in text and JSON", () => {
    const result = computeRecordAiSummary({
      record: {
        name: "Ada",
        email: "ada@example.com",
        secret: "hidden",
      },
      template,
    });

    expect(result.aiSummaryText).toBe("Ada <***> ");
    expect(result.aiSummaryJson).toEqual({ name: "Ada", email: "***" });
    expect(result.needsReembed).toBe(true);
  });

  it("uses the summary hash as the re-embedding gate", () => {
    const first = computeRecordAiSummary({
      record: { name: "Ada", email: "a@example.com" },
      template,
    });
    const unchanged = computeRecordAiSummary({
      record: {
        name: "Ada",
        email: "different@example.com",
        aiSummaryHash: first.aiSummaryHash,
      },
      template,
    });
    const changed = computeRecordAiSummary({
      record: {
        name: "Grace",
        email: "different@example.com",
        aiSummaryHash: first.aiSummaryHash,
      },
      template,
    });

    expect(unchanged.needsReembed).toBe(false);
    expect(changed.needsReembed).toBe(true);
  });
});
