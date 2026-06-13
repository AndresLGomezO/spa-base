import { describe, expect, it } from "vitest";

import { createInMemoryAiJobRepository } from "@repo/firestore-converters";

import { markAiJobFailedIfExists } from "./mark-ai-job-failed.js";

describe("markAiJobFailedIfExists", () => {
  it("marks a pending job as failed with the error code", async () => {
    const repository = createInMemoryAiJobRepository();
    const created = await repository.create("tenant_a", {
      feature: "uiBuilder",
      input: {
        question: "Design a list",
        entityName: "contract",
        surface: "list",
      },
      requestedBy: "user_1",
      permission: "ai.uiBuilder.run",
    });

    await markAiJobFailedIfExists(
      repository,
      "tenant_a",
      created.id,
      "JOB_NOT_FOUND",
    );

    const updated = await repository.getById("tenant_a", created.id);
    expect(updated?.status).toBe("failed");
    expect(updated?.error).toBe("JOB_NOT_FOUND");
  });

  it("does not overwrite completed jobs", async () => {
    const repository = createInMemoryAiJobRepository();
    const created = await repository.create("tenant_a", {
      feature: "uiBuilder",
      input: {
        question: "Design a list",
        entityName: "contract",
        surface: "list",
      },
      requestedBy: "user_1",
      permission: "ai.uiBuilder.run",
    });
    await repository.update("tenant_a", created.id, {
      status: "completed",
      output: { answer: "done" },
      error: null,
    });

    await markAiJobFailedIfExists(
      repository,
      "tenant_a",
      created.id,
      "JOB_NOT_FOUND",
    );

    const updated = await repository.getById("tenant_a", created.id);
    expect(updated?.status).toBe("completed");
    expect(updated?.error).toBeNull();
  });
});
