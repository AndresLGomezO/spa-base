import { describe, expect, it } from "vitest";

import { defineEntity } from "@repo/entities";
import { indexesForEntity } from "@repo/firestore-indexes";

import { queryNeedsClientFallback } from "./query-index-match.js";

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
