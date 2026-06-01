import { describe, expect, it } from "vitest";

import { createInMemoryEntityDefinitionRepository } from "./in-memory-repository.js";

describe("createInMemoryEntityDefinitionRepository displayField", () => {
  it("persists displayField on create and update", async () => {
    const repository = createInMemoryEntityDefinitionRepository();

    const created = await repository.create("tenant_a", {
      name: "loan",
      label: "Loans",
      fields: [{ name: "title", type: "string", required: true }],
      displayField: "title",
    });

    expect(created.displayField).toBe("title");

    const updated = await repository.update("tenant_a", created.id, {
      displayField: "title",
      fields: [{ name: "title", type: "string", required: true }],
    });

    expect(updated.displayField).toBe("title");

    const cleared = await repository.update("tenant_a", created.id, {
      displayField: null,
      fields: [{ name: "title", type: "string", required: true }],
    });

    expect(cleared.displayField).toBeUndefined();
  });
});
