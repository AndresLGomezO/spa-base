import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryListSnapshotCache } from "./in-memory-list-snapshot-cache.js";
import { createFirestoreEntityQueryExecutor } from "./firestore-entity-query-executor.js";
import { makeNormalizedEntityQuery } from "./test-normalized-query.js";

const mockGet = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();

function createChainableQuery() {
  const query = {
    where: mockWhere.mockReturnThis(),
    orderBy: mockOrderBy.mockReturnThis(),
    limit: mockLimit.mockReturnThis(),
    get: mockGet,
  };
  return query;
}

const mockCollectionRef = {
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  doc: vi.fn(),
};

vi.mock("./firebase-admin.js", () => ({
  getFirestoreAdmin: vi.fn(() => ({})),
}));

vi.mock("./tenant-entity-path.js", () => ({
  tenantEntityCollectionRef: vi.fn(() => mockCollectionRef),
}));

const records = [
  {
    id: "a1",
    tenantId: "tenant_a",
    name: "Alpha needle",
    titleSearchTokens: ["alpha", "needle"],
    accessUserIds: ["user_1"],
  },
  {
    id: "b2",
    tenantId: "tenant_a",
    name: "Beta only",
    titleSearchTokens: ["beta"],
    accessUserIds: ["user_1"],
  },
];

const converter = {
  read: (raw: unknown) => raw as (typeof records)[number],
};

describe("createFirestoreEntityQueryExecutor in-memory list pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockImplementation(() => createChainableQuery());
    mockOrderBy.mockImplementation(() => createChainableQuery());
    mockLimit.mockImplementation(() => createChainableQuery());
    mockGet.mockResolvedValue({
      docs: records.map((record) => ({
        data: () => record,
      })),
    });
  });

  it("routes search through in-memory pipeline when inMemoryListQueries is enabled", async () => {
    const executor = createFirestoreEntityQueryExecutor({
      config: { projectId: "demo" },
      collection: "articles",
      converter,
      inMemoryListQueries: true,
      clientFallbackMaxDocs: 1000,
      tenantWideRead: false,
    });

    const result = await executor.executeQuery(
      "tenant_a",
      makeNormalizedEntityQuery({
        filters: [
          {
            field: "accessUserIds",
            operator: "array-contains",
            value: "user_1",
          },
        ],
        postFilters: [
          {
            field: "__searchSourceFields__",
            operator: "sourceFieldsContain",
            value: { term: "needle", fields: ["name"] },
          },
        ],
        search: "needle",
        sort: { field: "name", direction: "desc" },
        limit: 25,
      }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("a1");
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockOrderBy).toHaveBeenCalledWith("id", "asc");
    expect(mockOrderBy).not.toHaveBeenCalledWith("name", "desc");
  });

  it("reuses cached snapshot on a second list request within TTL", async () => {
    const cache = createInMemoryListSnapshotCache({ ttlMs: 60_000 });
    const executor = createFirestoreEntityQueryExecutor({
      config: { projectId: "demo" },
      collection: "articles",
      converter,
      inMemoryListQueries: true,
      clientFallbackMaxDocs: 1000,
      inMemoryListSnapshotCache: cache,
      tenantWideRead: false,
    });

    const baseQuery = makeNormalizedEntityQuery({
      filters: [
        {
          field: "accessUserIds",
          operator: "array-contains",
          value: "user_1",
        },
      ],
      postFilters: [],
      sort: null,
      limit: 25,
    });

    await executor.executeQuery("tenant_a", {
      ...baseQuery,
      sort: { field: "id", direction: "asc" },
    });
    await executor.executeQuery("tenant_a", {
      ...baseQuery,
      sort: { field: "name", direction: "asc" },
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
