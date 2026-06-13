import { describe, expect, it } from "vitest";

import { createInMemoryAiJobRepository } from "@repo/firestore-converters";

describe("AiJobRepository uiBuilder input persistence", () => {
  it("preserves entityName and surface for uiBuilder jobs", async () => {
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

    expect(created.input).toEqual({
      question: "Design a list",
      entityName: "contract",
      surface: "list",
    });

    const loaded = await repository.getById("tenant_a", created.id);
    expect(loaded?.input).toEqual({
      question: "Design a list",
      entityName: "contract",
      surface: "list",
    });
  });

  it("still accepts chat jobs with question-only input", async () => {
    const repository = createInMemoryAiJobRepository();
    const created = await repository.create("tenant_a", {
      feature: "chat",
      input: { question: "hello" },
      requestedBy: "user_1",
      permission: "ai.chat.run",
    });

    expect(created.input).toEqual({ question: "hello" });
  });
});
