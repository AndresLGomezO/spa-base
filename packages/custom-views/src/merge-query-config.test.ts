import { describe, expect, it } from "vitest";

import { mergeSavedQueryWithRuntimeQuery } from "./merge-query-config.js";

describe("mergeSavedQueryWithRuntimeQuery", () => {
  it("AND-merges saved filter tree with runtime flat filters", () => {
    const merged = mergeSavedQueryWithRuntimeQuery({
      savedFilterTree: {
        type: "condition",
        field: "status",
        operator: "==",
        value: "active",
      },
      definitionSort: [{ field: "createdAt", direction: "desc" }],
      runtimeQuery: {
        filter: [{ field: "type", operator: "==", value: "sale" }],
        pagination: { limit: 10 },
      },
    });

    expect(merged.filter).toEqual({
      type: "group",
      combinator: "and",
      children: [
        {
          type: "condition",
          field: "status",
          operator: "==",
          value: "active",
        },
        {
          type: "group",
          combinator: "and",
          children: [
            {
              type: "condition",
              field: "type",
              operator: "==",
              value: "sale",
            },
          ],
        },
      ],
    });
  });

  it("prefers runtime sort over definition sort", () => {
    const merged = mergeSavedQueryWithRuntimeQuery({
      savedFilterTree: null,
      definitionSort: [{ field: "createdAt", direction: "desc" }],
      runtimeQuery: {
        sort: [{ field: "name", direction: "asc" }],
        pagination: { limit: 10 },
      },
    });

    expect(merged.sort).toEqual([{ field: "name", direction: "asc" }]);
  });

  it("falls back to definition sort when runtime sort is empty", () => {
    const merged = mergeSavedQueryWithRuntimeQuery({
      savedFilterTree: null,
      definitionSort: [{ field: "createdAt", direction: "desc" }],
      runtimeQuery: {
        pagination: { limit: 10 },
      },
    });

    expect(merged.sort).toEqual([{ field: "createdAt", direction: "desc" }]);
  });

  it("preserves runtime search and pagination", () => {
    const merged = mergeSavedQueryWithRuntimeQuery({
      savedFilterTree: null,
      definitionSort: [],
      runtimeQuery: {
        search: "invoice",
        pagination: { limit: 25, offset: 10 },
      },
    });

    expect(merged.search).toBe("invoice");
    expect(merged.pagination).toEqual({ limit: 25, offset: 10 });
  });
});
