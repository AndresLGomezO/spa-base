import { describe, expect, it } from "vitest";

import { createInMemoryAiContextSectionRepository } from "./in-memory-repository.js";

describe("createInMemoryAiContextSectionRepository", () => {
  it("creates, lists, updates, and deletes sections in order", async () => {
    const repo = createInMemoryAiContextSectionRepository();

    const first = await repo.create("t1", {
      name: "Profile",
      blocks: [{ kind: "staticMarkdown", content: "Hello" }],
    });
    const second = await repo.create("t1", {
      name: "Metrics",
      order: 0,
      enabled: false,
    });

    expect(first.order).toBe(0);
    expect(second.order).toBe(0);

    const listed = await repo.list("t1");
    expect(listed.map((item) => item.name)).toEqual(["Metrics", "Profile"]);

    const enabled = await repo.listEnabled("t1");
    expect(enabled.map((item) => item.name)).toEqual(["Profile"]);

    const updated = await repo.update("t1", first.id, {
      name: "Profile v2",
      order: 5,
    });
    expect(updated.name).toBe("Profile v2");
    expect(updated.order).toBe(5);

    await repo.delete("t1", second.id);
    expect(await repo.getById("t1", second.id)).toBeNull();
    expect((await repo.list("t1")).map((item) => item.id)).toEqual([first.id]);
  });

  it("replaceAll swaps the catalog for a tenant", async () => {
    const repo = createInMemoryAiContextSectionRepository();
    await repo.create("t1", { name: "Old" });
    const now = new Date().toISOString();
    const replaced = await repo.replaceAll("t1", [
      {
        id: "aics_new",
        tenantId: "t1",
        name: "New",
        order: 1,
        enabled: true,
        scope: "perUser",
        visibility: {},
        blocks: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);
    expect(replaced).toHaveLength(1);
    expect(replaced[0]?.name).toBe("New");
    expect(await repo.list("t1")).toHaveLength(1);
  });
});
