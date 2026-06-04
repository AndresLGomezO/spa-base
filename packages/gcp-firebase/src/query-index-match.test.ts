import { describe, expect, it } from "vitest";

import { defineEntity } from "@repo/entities";
import { indexesForEntity } from "@repo/firestore-indexes";

import {
  queryNeedsClientFallback,
  shouldExecuteInMemoryListQuery,
} from "./query-index-match.js";

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

describe("shouldExecuteInMemoryListQuery", () => {
  const listQuery = {
    filters: [
      {
        field: "accessUserIds",
        operator: "array-contains" as const,
        value: "u1",
      },
      { field: "status", operator: "==" as const, value: "open" },
    ],
    postFilters: [],
    sort: { field: "priority", direction: "asc" as const },
    limit: 25,
  };

  it("forces server in-memory list path when entity flag is enabled", () => {
    expect(
      shouldExecuteInMemoryListQuery(listQuery, {
        inMemoryListQueries: true,
        clientFallbackMaxDocs: 1000,
      }),
    ).toBe(true);
  });

  it("does not apply when flag is off or cap is zero", () => {
    expect(
      shouldExecuteInMemoryListQuery(listQuery, {
        inMemoryListQueries: false,
        clientFallbackMaxDocs: 1000,
      }),
    ).toBe(false);
    expect(
      shouldExecuteInMemoryListQuery(listQuery, {
        inMemoryListQueries: true,
        clientFallbackMaxDocs: 0,
      }),
    ).toBe(false);
  });

  it("skips search and post-filter queries", () => {
    expect(
      shouldExecuteInMemoryListQuery(
        { ...listQuery, search: "needle" },
        { inMemoryListQueries: true, clientFallbackMaxDocs: 1000 },
      ),
    ).toBe(false);
    expect(
      shouldExecuteInMemoryListQuery(
        {
          ...listQuery,
          postFilters: [{ field: "status", operator: "==", value: "open" }],
        },
        { inMemoryListQueries: true, clientFallbackMaxDocs: 1000 },
      ),
    ).toBe(false);
  });
});

describe("queryNeedsClientFallback", () => {
  const planned = indexesForEntity(Task);

  it("requires fallback for filter+sort combos without a dedicated index", () => {
    expect(
      queryNeedsClientFallback(
        {
          filters: [
            { field: "accessUserIds", operator: "array-contains", value: "u1" },
            { field: "status", operator: "==", value: "open" },
          ],
          postFilters: [],
          sort: { field: "priority", direction: "asc" },
          limit: 25,
        },
        "tasks",
        planned,
        false,
      ),
    ).toBe(true);
  });

  it("uses firestore path for sort-only planned queries", () => {
    expect(
      queryNeedsClientFallback(
        {
          filters: [
            { field: "accessUserIds", operator: "array-contains", value: "u1" },
          ],
          postFilters: [],
          sort: { field: "createdAt", direction: "desc" },
          limit: 25,
        },
        "tasks",
        planned,
        false,
      ),
    ).toBe(false);
  });
});
