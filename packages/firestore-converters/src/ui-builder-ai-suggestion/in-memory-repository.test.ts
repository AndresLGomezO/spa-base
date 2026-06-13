import { describe, expect, it } from "vitest";

import { createInMemoryUiBuilderAiSuggestionRepository } from "@repo/firestore-converters";

describe("UiBuilderAiSuggestionRepository", () => {
  it("lists suggestions scoped to entity and surface", async () => {
    const repo = createInMemoryUiBuilderAiSuggestionRepository();

    await repo.create("tenant_1", {
      entityName: "account",
      surface: "list",
      jobId: "aijob_1",
      status: "ready",
      sliceData: { listViewType: "card" },
      createdBy: "user_1",
    });
    await repo.create("tenant_1", {
      entityName: "bank",
      surface: "list",
      jobId: "aijob_2",
      status: "ready",
      createdBy: "user_1",
    });

    const accountSuggestions = await repo.listByEntityAndSurface(
      "tenant_1",
      "account",
      "list",
    );
    expect(accountSuggestions).toHaveLength(1);
    expect(accountSuggestions[0]?.entityName).toBe("account");
  });
});
