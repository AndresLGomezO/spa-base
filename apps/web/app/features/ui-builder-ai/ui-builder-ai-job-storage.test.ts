import { afterEach, describe, expect, it } from "vitest";

import {
  clearLastUiBuilderRun,
  readLastUiBuilderRun,
  writeLastUiBuilderRun,
  type UiBuilderAiJobStorageScope,
} from "./ui-builder-ai-job-storage";

const scope: UiBuilderAiJobStorageScope = {
  tenantId: "tenant_a",
  entityName: "contract",
  surface: "list",
};

describe("ui-builder-ai last run storage", () => {
  afterEach(() => {
    clearLastUiBuilderRun(scope);
  });

  it("writes and reads the last run record", () => {
    writeLastUiBuilderRun(scope, {
      jobId: "aijob_1",
      status: "failed",
      error:
        "Vertex AI rate limit exceeded. Please wait a moment and try again.",
      finishedAt: "2026-06-13T14:37:56.943Z",
    });

    expect(readLastUiBuilderRun(scope)).toEqual({
      jobId: "aijob_1",
      status: "failed",
      error:
        "Vertex AI rate limit exceeded. Please wait a moment and try again.",
      finishedAt: "2026-06-13T14:37:56.943Z",
    });
  });

  it("returns null for invalid stored payloads", () => {
    sessionStorage.setItem(
      "ui-builder-ai:last-run:tenant_a:contract:list",
      '{"jobId":""}',
    );

    expect(readLastUiBuilderRun(scope)).toBeNull();
  });
});
