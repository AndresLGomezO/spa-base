import { describe, expect, it } from "vitest";

import {
  aiUiBuilderInputSchema,
  createUiBuilderSuggestionInputSchema,
} from "@repo/ai-engine/schemas";

describe("aiUiBuilderInputSchema render mode", () => {
  it("defaults outputMode to structure", () => {
    const parsed = aiUiBuilderInputSchema.parse({
      question: "Design a form",
      entityName: "contract",
      surface: "forms",
    });
    expect(parsed.outputMode).toBe("structure");
  });

  it("accepts render mode with iteration fields", () => {
    const parsed = aiUiBuilderInputSchema.parse({
      question: "Refine spacing",
      entityName: "contract",
      surface: "forms",
      outputMode: "render",
      parentSuggestionId: "aisug_abc123",
      modificationRequest: "Increase helper callout contrast",
    });
    expect(parsed.outputMode).toBe("render");
    expect(parsed.parentSuggestionId).toBe("aisug_abc123");
  });
});

describe("createUiBuilderSuggestionInputSchema render fields", () => {
  it("accepts render suggestion payload with renderHtml", () => {
    const parsed = createUiBuilderSuggestionInputSchema.parse({
      entityName: "contract",
      surface: "forms",
      jobId: "job_1",
      status: "ready",
      outputMode: "render",
      renderHtml: "<!DOCTYPE html><html><body><form></form></body></html>",
      renderBrief: JSON.stringify({
        layoutSummary: "Premium wizard preview",
        presentation: "wizard",
        wizardSteps: [{ id: "step-1", label: "Basic Information" }],
      }),
      iterationNumber: 0,
      createdBy: "user_1",
    });
    expect(parsed.outputMode).toBe("render");
    expect(parsed.renderHtml).toContain("<!DOCTYPE html>");
  });
});
