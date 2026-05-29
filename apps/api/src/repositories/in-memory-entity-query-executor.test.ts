import { describe, expect, it } from "vitest";

import {
  createInMemoryEntityQueryExecutor,
  createInMemoryEntityQueryStore,
  seedInMemoryEntityQueryStore,
} from "./in-memory-entity-query-executor.js";

describe("createInMemoryEntityQueryExecutor", () => {
  it("filters, sorts, and paginates tenant-scoped records", async () => {
    const store = createInMemoryEntityQueryStore();
    seedInMemoryEntityQueryStore(store, [
      { id: "o1", tenantId: "tenant_a", customerId: "c1", total: 30 },
      { id: "o2", tenantId: "tenant_a", customerId: "c1", total: 10 },
      { id: "o3", tenantId: "tenant_a", customerId: "c2", total: 20 },
      { id: "o4", tenantId: "tenant_b", customerId: "c1", total: 99 },
    ]);

    const executor = createInMemoryEntityQueryExecutor(() => store);

    const filtered = await executor.executeQuery("tenant_a", {
      filters: [{ field: "customerId", operator: "==", value: "c1" }],
      sort: { field: "total", direction: "desc" },
      limit: 10,
    });

    expect(filtered.items.map((item) => item.id)).toEqual(["o1", "o2"]);

    const pageOne = await executor.executeQuery("tenant_a", {
      filters: [],
      sort: { field: "id", direction: "asc" },
      limit: 2,
    });
    expect(pageOne.items.map((item) => item.id)).toEqual(["o1", "o2"]);
    expect(pageOne.nextCursor).toBe("o2");

    const pageTwo = await executor.executeQuery("tenant_a", {
      filters: [],
      sort: { field: "id", direction: "asc" },
      limit: 2,
      cursor: pageOne.nextCursor ?? undefined,
    });
    expect(pageTwo.items.map((item) => item.id)).toEqual(["o3"]);
    expect(pageTwo.nextCursor).toBeNull();
  });

  it("finds records by id within tenant scope", async () => {
    const store = createInMemoryEntityQueryStore();
    seedInMemoryEntityQueryStore(store, [
      { id: "c1", tenantId: "tenant_a", name: "Jane" },
    ]);

    const executor = createInMemoryEntityQueryExecutor(() => store);

    expect(await executor.findById("c1", "tenant_a")).toMatchObject({
      id: "c1",
      name: "Jane",
    });
    expect(await executor.findById("c1", "tenant_b")).toBeNull();
  });
});
