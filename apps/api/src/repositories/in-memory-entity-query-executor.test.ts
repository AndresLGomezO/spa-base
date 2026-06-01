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
      { id: "o1", tenantId: "tenant_a", organizationId: "c1", budget: 30 },
      { id: "o2", tenantId: "tenant_a", organizationId: "c1", budget: 10 },
      { id: "o3", tenantId: "tenant_a", organizationId: "c2", budget: 20 },
      { id: "o4", tenantId: "tenant_b", organizationId: "c1", budget: 99 },
    ]);

    const executor = createInMemoryEntityQueryExecutor(() => store);

    const filtered = await executor.executeQuery("tenant_a", {
      filters: [{ field: "organizationId", operator: "==", value: "c1" }],
      postFilters: [],
      sort: { field: "budget", direction: "desc" },
      limit: 10,
    });

    expect(filtered.items.map((item) => item.id)).toEqual(["o1", "o2"]);

    const pageOne = await executor.executeQuery("tenant_a", {
      filters: [],
      postFilters: [],
      sort: { field: "id", direction: "asc" },
      limit: 2,
    });
    expect(pageOne.items.map((item) => item.id)).toEqual(["o1", "o2"]);
    expect(pageOne.nextCursor).toBe("o2");

    const pageTwo = await executor.executeQuery("tenant_a", {
      filters: [],
      postFilters: [],
      sort: { field: "id", direction: "asc" },
      limit: 2,
      cursor: pageOne.nextCursor ?? undefined,
    });
    expect(pageTwo.items.map((item) => item.id)).toEqual(["o3"]);
    expect(pageTwo.nextCursor).toBeNull();
    expect(pageOne.totalCount).toBe(3);
  });

  it("paginates with offset and returns totalCount", async () => {
    const store = createInMemoryEntityQueryStore();
    seedInMemoryEntityQueryStore(store, [
      { id: "o1", tenantId: "tenant_a", name: "One" },
      { id: "o2", tenantId: "tenant_a", name: "Two" },
      { id: "o3", tenantId: "tenant_a", name: "Three" },
    ]);

    const executor = createInMemoryEntityQueryExecutor(() => store);

    const page = await executor.executeQuery("tenant_a", {
      filters: [],
      postFilters: [],
      sort: { field: "id", direction: "asc" },
      limit: 2,
      offset: 2,
    });

    expect(page.items.map((item) => item.id)).toEqual(["o3"]);
    expect(page.totalCount).toBe(3);
    expect(page.nextCursor).toBeNull();
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

  it("matches search via token post-filter on any word prefix", async () => {
    const store = createInMemoryEntityQueryStore();
    seedInMemoryEntityQueryStore(store, [
      {
        id: "a1",
        tenantId: "tenant_a",
        name: "Bancolombia Ahorros",
        nameSearchTokens: ["bancolombia", "ahorros"],
      },
      {
        id: "a2",
        tenantId: "tenant_a",
        name: "Other Bank",
        nameSearchTokens: ["other", "bank"],
      },
    ]);

    const executor = createInMemoryEntityQueryExecutor(() => store);

    const bancol = await executor.executeQuery("tenant_a", {
      filters: [],
      postFilters: [
        {
          field: "nameSearchTokens",
          operator: "tokenStartsWith",
          value: "bancol",
        },
      ],
      sort: { field: "id", direction: "asc" },
      limit: 10,
      search: "bancol",
    });
    expect(bancol.items.map((item) => item.id)).toEqual(["a1"]);

    const ahorr = await executor.executeQuery("tenant_a", {
      filters: [],
      postFilters: [
        {
          field: "nameSearchTokens",
          operator: "tokenStartsWith",
          value: "ahorr",
        },
      ],
      sort: { field: "id", direction: "asc" },
      limit: 10,
      search: "ahorr",
    });
    expect(ahorr.items.map((item) => item.id)).toEqual(["a1"]);
  });
});
