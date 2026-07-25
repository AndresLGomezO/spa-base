import { describe, expect, it } from "vitest";

import {
  aiRecordSummaryTemplateSchema,
  parseAiRecordSummaryTemplate,
} from "./ai-record-summary-template.schema.js";

describe("aiRecordSummaryTemplateSchema", () => {
  it("parses a serialized template and applies collection defaults", () => {
    expect(
      parseAiRecordSummaryTemplate(
        JSON.stringify({ textTemplate: "{{name}}" }),
      ),
    ).toEqual({
      textTemplate: "{{name}}",
      jsonFields: [],
      embeddingFields: [],
      piiLevel: {},
    });
  });

  it("rejects oversized templates and invalid PII levels", () => {
    expect(() =>
      aiRecordSummaryTemplateSchema.parse({
        textTemplate: "x".repeat(8_001),
        piiLevel: { email: "private" },
      }),
    ).toThrow();
  });
});
