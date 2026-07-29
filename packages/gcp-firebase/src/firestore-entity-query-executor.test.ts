import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryListSnapshotCache } from "./in-memory-list-snapshot-cache.js";
import { createFirestoreEntityQueryExecutor } from "./firestore-entity-query-executor.js";
import { makeNormalizedEntityQuery } from "./test-normalized-query.js";

const mockGet = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockStartAfter = vi.fn();

function createChainableQuery() {
  const query = {
    where: mockWhere.mockReturnThis(),
    orderBy: mockOrderBy.mockReturnThis(),
    limit: mockLimit.mockReturnThis(),
    startAfter: mockStartAfter.mockReturnThis(),
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
    mockStartAfter.mockImplementation(() => createChainableQuery());
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

  it("paginates in-memory snapshot loads beyond a single Firestore page", async () => {
    const manyRecords = Array.from({ length: 150 }, (_, index) => ({
      id: `record_${String(index).padStart(3, "0")}`,
      tenantId: "tenant_a",
      status: index >= 140 ? "UPCOMING" : "PAID",
      accessUserIds: ["user_1"],
    }));

    let callCount = 0;
    mockGet.mockImplementation(async () => {
      const pageIndex = callCount;
      callCount += 1;
      const pageSize = 100;
      const start = pageIndex * pageSize;
      const slice = manyRecords.slice(start, start + pageSize);
      return {
        docs: slice.map((record) => ({
          data: () => record,
        })),
      };
    });

    const executor = createFirestoreEntityQueryExecutor({
      config: { projectId: "demo" },
      collection: "paymentSchedules",
      converter,
      inMemoryListQueries: true,
      clientFallbackMaxDocs: 5000,
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
          {
            field: "status",
            operator: "==",
            value: "UPCOMING",
          },
        ],
        postFilters: [],
        sort: { field: "id", direction: "asc" },
        limit: 25,
      }),
    );

    expect(callCount).toBeGreaterThan(1);
    expect(result.items).toHaveLength(10);
    expect(result.items.every((item) => item.status === "UPCOMING")).toBe(true);
  });
});

describe("createFirestoreEntityQueryExecutor range resort", () => {
  const rangeRecords = [
    {
      id: "t1",
      tenantId: "tenant_a",
      date: "2026-07-10",
      amount: 300,
      accessUserIds: ["user_1"],
    },
    {
      id: "t2",
      tenantId: "tenant_a",
      date: "2026-07-05",
      amount: 100,
      accessUserIds: ["user_1"],
    },
    {
      id: "t3",
      tenantId: "tenant_a",
      date: "2026-07-20",
      amount: 200,
      accessUserIds: ["user_1"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockImplementation(() => createChainableQuery());
    mockOrderBy.mockImplementation(() => createChainableQuery());
    mockLimit.mockImplementation(() => createChainableQuery());
    mockStartAfter.mockImplementation(() => createChainableQuery());
    mockGet.mockResolvedValue({
      empty: false,
      docs: rangeRecords.map((record) => ({
        data: () => record,
      })),
    });
  });

  it("scans by inequality field then returns results sorted by requested field", async () => {
    const executor = createFirestoreEntityQueryExecutor({
      config: { projectId: "demo" },
      collection: "transactions",
      converter: {
        read: (raw: unknown) => raw as (typeof rangeRecords)[number],
      },
      clientFallbackMaxDocs: 1000,
      tenantWideRead: true,
    });

    const result = await executor.executeQuery(
      "tenant_a",
      makeNormalizedEntityQuery({
        filters: [
          {
            field: "date",
            operator: ">=",
            value: "2026-07-01T00:00:00.000Z",
          },
          {
            field: "date",
            operator: "<=",
            value: "2026-07-31T23:59:59.999Z",
          },
        ],
        postFilters: [],
        sort: { field: "amount", direction: "asc" },
        scanSort: { field: "date", direction: "asc" },
        executionMode: "rangeResort",
        limit: 10,
      }),
    );

    expect(result.items.map((item) => item.id)).toEqual(["t2", "t3", "t1"]);
    expect(mockOrderBy).toHaveBeenCalledWith("date", "asc");
    expect(result.totalCount).toBe(3);
  });

  it("throws QUERY_TOO_BROAD when the range scan exceeds the doc cap", async () => {
    const capped = Array.from({ length: 2 }, (_, index) => ({
      id: `cap_${index}`,
      tenantId: "tenant_a",
      date: `2026-07-0${index + 1}`,
      amount: index * 10,
    }));

    let getCalls = 0;
    mockGet.mockImplementation(async () => {
      getCalls += 1;
      if (getCalls === 1) {
        return {
          empty: false,
          docs: capped.map((record) => ({ data: () => record })),
        };
      }
      return {
        empty: false,
        docs: [
          { data: () => ({ id: "extra", date: "2026-07-99", amount: 1 }) },
        ],
      };
    });

    const executor = createFirestoreEntityQueryExecutor({
      config: { projectId: "demo" },
      collection: "transactions",
      converter: {
        read: (raw: unknown) => raw as (typeof capped)[number],
      },
      clientFallbackMaxDocs: 2,
      tenantWideRead: true,
    });

    await expect(
      executor.executeQuery(
        "tenant_a",
        makeNormalizedEntityQuery({
          filters: [
            {
              field: "date",
              operator: ">=",
              value: "2026-07-01T00:00:00.000Z",
            },
          ],
          postFilters: [],
          sort: { field: "amount", direction: "asc" },
          scanSort: { field: "date", direction: "asc" },
          executionMode: "rangeResort",
          limit: 10,
        }),
      ),
    ).rejects.toMatchObject({
      code: "QUERY_TOO_BROAD",
    });
  });
});
