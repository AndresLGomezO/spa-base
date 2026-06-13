import { describe, expect, it } from "vitest";

import {
  findSuggestionByJobId,
  formatAiJobError,
  resolveLastUiBuilderRunDisplay,
} from "./use-ai-ui-builder";
import type { UiBuilderSuggestionRecord } from "../../lib/api-client";
import type { UiBuilderLastRun } from "./ui-builder-ai-job-storage";

function suggestion(
  overrides: Partial<UiBuilderSuggestionRecord> = {},
): UiBuilderSuggestionRecord {
  return {
    id: "aisug_1",
    tenantId: "tenant_a",
    entityName: "widget",
    surface: "list",
    jobId: "aijob_1",
    status: "ready",
    createdBy: "user_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("findSuggestionByJobId", () => {
  it("returns the matching suggestion", () => {
    const suggestions = [
      suggestion({ id: "aisug_a", jobId: "aijob_a" }),
      suggestion({ id: "aisug_b", jobId: "aijob_b" }),
    ];

    expect(findSuggestionByJobId(suggestions, "aijob_b")?.id).toBe("aisug_b");
  });

  it("returns undefined when no suggestion matches", () => {
    expect(
      findSuggestionByJobId([suggestion()], "aijob_missing"),
    ).toBeUndefined();
  });
});

describe("useAiUiBuilderJob polling", () => {
  it("stops polling when job reaches a terminal status", () => {
    function refetchInterval(
      status: "pending" | "running" | "completed" | "failed",
    ) {
      if (status === "completed" || status === "failed") {
        return false;
      }
      return 1000;
    }

    expect(refetchInterval("pending")).toBe(1000);
    expect(refetchInterval("running")).toBe(1000);
    expect(refetchInterval("completed")).toBe(false);
    expect(refetchInterval("failed")).toBe(false);
  });
});

describe("resolveLastUiBuilderRunDisplay", () => {
  const lastRun: UiBuilderLastRun = {
    jobId: "aijob_1",
    status: "failed",
    error: "Vertex AI rate limit exceeded. Please wait a moment and try again.",
    finishedAt: "2026-06-13T14:37:56.943Z",
  };

  it("returns the stored job error when no suggestion exists", () => {
    expect(resolveLastUiBuilderRunDisplay(lastRun, [])).toEqual({
      suggestion: null,
      jobError: lastRun.error,
      finishedAt: lastRun.finishedAt,
      status: "failed",
    });
  });

  it("returns the matching ready suggestion for completed runs", () => {
    const suggestions = [
      suggestion({ jobId: "aijob_1", status: "ready", listViewType: "table" }),
    ];

    expect(
      resolveLastUiBuilderRunDisplay(
        { ...lastRun, status: "completed", error: undefined },
        suggestions,
      ),
    ).toEqual({
      suggestion: suggestions[0],
      jobError: null,
      finishedAt: lastRun.finishedAt,
      status: "completed",
    });
  });
});

describe("formatAiJobError", () => {
  it("maps rate limit errors to the translated label", () => {
    expect(
      formatAiJobError("429 Too Many Requests RESOURCE_EXHAUSTED", () =>
        t("itemListDesigner.ai.rateLimitError"),
      ),
    ).toBe("Rate limit message");
  });
});

function t(key: string): string {
  if (key === "itemListDesigner.ai.rateLimitError") {
    return "Rate limit message";
  }
  return key;
}
