import { defineEntity } from "@repo/entities";
import { describe, expect, it } from "vitest";

import {
  buildListQueryIndex,
  computeIndexSignature,
  indexesForEntity,
} from "./build-indexes.js";
import {
  matchesPlannedIndex,
  planIndexesForEntity,
  planIndexesForTenant,
} from "./index-plan.js";

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

describe("planIndexesForEntity", () => {
  it("uses curated catalog without filter x sort cartesian", () => {
    const plan = planIndexesForEntity(Task);
    expect(plan.summary.total).toBeLessThan(40);
    expect(plan.summary.ownershipBaseline).toBe(1);
    expect(plan.summary.filterOnly).toBeGreaterThan(0);
    expect(plan.summary.sortOnly).toBeGreaterThan(0);

    const signatures = new Set(
      plan.indexes.map((index) => computeIndexSignature(index)),
    );
    expect(
      signatures.has(
        computeIndexSignature(
          buildListQueryIndex("tasks", {
            filterFields: ["status"],
            sortField: "priority",
            sortDirection: "ASCENDING",
          }),
        ),
      ),
    ).toBe(false);
    expect(
      signatures.has(
        computeIndexSignature(
          buildListQueryIndex("tasks", {
            filterFields: ["status"],
            sortField: "id",
            sortDirection: "ASCENDING",
          }),
        ),
      ),
    ).toBe(true);
  });
});

describe("matchesPlannedIndex", () => {
  it("matches sort-only and filter+id shapes", () => {
    const plan = planIndexesForEntity(Task);
    expect(
      matchesPlannedIndex("tasks", plan.indexes, {
        equalityFilterFields: [],
        sortField: "createdAt",
        sortDirection: "DESCENDING",
      }),
    ).toBe(true);
    expect(
      matchesPlannedIndex("tasks", plan.indexes, {
        equalityFilterFields: ["priority"],
        sortField: "id",
        sortDirection: "ASCENDING",
      }),
    ).toBe(true);
    expect(
      matchesPlannedIndex("tasks", plan.indexes, {
        equalityFilterFields: ["status"],
        sortField: "priority",
        sortDirection: "ASCENDING",
      }),
    ).toBe(false);
  });
});

describe("planIndexesForTenant", () => {
  it("aggregates per-entity plans", () => {
    const tenantPlan = planIndexesForTenant([Task]);
    expect(tenantPlan.total).toBe(tenantPlan.entities[0]?.summary.total);
    expect(tenantPlan.summary.total).toBe(tenantPlan.total);
  });
});

describe("indexesForEntity curated count", () => {
  it("matches expected formula for task entity", () => {
    const indexes = indexesForEntity(Task);
    // 1 baseline + 2*2 sort + 2*2 filter (status, priority) deduped
    expect(indexes.length).toBe(9);
  });
});
