import { describe, expect, it } from "vitest";

import { defineEntity } from "@repo/entities";
import { indexesForEntity } from "@repo/firestore-indexes";

import {
  queryNeedsClientFallback,
  shouldExecuteInMemoryListQuery,
  usesInMemoryListPipeline,
} from "./query-index-match.js";
import { makeNormalizedEntityQuery } from "./test-normalized-query.js";

const Task = defineEntity({
  name: "task",
  fields: {
    status: { type: "string", required: true },
    priority: { type: "number", required: true },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["status", "priority"] }],
    forms: {
      create: { sections: [{ fields: ["status", "priority"] }] },
      edit: { sections: [{ fields: ["status", "priority"] }] },
    },
    fields: {
      status: { filterable: true, sortable: true },
      priority: { filterable: true, sortable: false },
    },
  },
});

describe("usesInMemoryListPipeline", () => {
  it("enables unified pipeline when entity flag is on", () => {
    expect(
      usesInMemoryListPipeline({
        inMemoryListQueries: true,
        clientFallbackMaxDocs: 1000,
      }),
    ).toBe(true);
  });

  it("does not apply when flag is off or cap is zero", () => {
    expect(
      usesInMemoryListPipeline({
        inMemoryListQueries: false,
        clientFallbackMaxDocs: 1000,
      }),
    ).toBe(false);
    expect(
      usesInMemoryListPipeline({
        inMemoryListQueries: true,
        clientFallbackMaxDocs: 0,
      }),
    ).toBe(false);
  });
});

describe("shouldExecuteInMemoryListQuery", () => {
  const listQuery = makeNormalizedEntityQuery({
    filters: [
      {
        field: "accessUserIds",
        operator: "array-contains",
        value: "u1",
      },
    ],
    postFilters: [],
    sort: { field: "id", direction: "asc" },
    limit: 25,
  });

  it("defers to unified pipeline when inMemoryListQueries is enabled", () => {
    expect(
      shouldExecuteInMemoryListQuery(listQuery, {
        inMemoryListQueries: true,
        clientFallbackMaxDocs: 1000,
      }),
    ).toBe(false);
  });

  it("allows fallback for non-flag entities without search", () => {
    expect(
      shouldExecuteInMemoryListQuery(listQuery, {
        inMemoryListQueries: false,
        clientFallbackMaxDocs: 1000,
      }),
    ).toBe(true);
  });
});

describe("queryNeedsClientFallback", () => {
  const planned = indexesForEntity(Task);

  it("requires fallback for filter+sort combos without a dedicated index", () => {
    expect(
      queryNeedsClientFallback(
        makeNormalizedEntityQuery({
          filters: [
            { field: "accessUserIds", operator: "array-contains", value: "u1" },
            { field: "status", operator: "==", value: "open" },
          ],
          postFilters: [],
          sort: { field: "priority", direction: "asc" },
          limit: 25,
        }),
        "tasks",
        planned,
        false,
      ),
    ).toBe(true);
  });

  it("uses firestore path for sort-only planned queries", () => {
    expect(
      queryNeedsClientFallback(
        makeNormalizedEntityQuery({
          filters: [
            { field: "accessUserIds", operator: "array-contains", value: "u1" },
          ],
          postFilters: [],
          sort: { field: "createdAt", direction: "desc" },
          limit: 25,
        }),
        "tasks",
        planned,
        false,
      ),
    ).toBe(false);
  });
});
