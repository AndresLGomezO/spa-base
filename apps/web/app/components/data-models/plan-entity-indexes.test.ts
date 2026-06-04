import { describe, expect, it } from "vitest";

import type { FieldDefinitionInput } from "../../lib/api-client";

import {
  computeFieldIndexContribution,
  formatFieldIndexContribution,
  planEntityIndexesFromDraft,
} from "./plan-entity-indexes";

const baseFields: readonly FieldDefinitionInput[] = [
  {
    name: "title",
    type: "string",
    required: true,
    ui: { order: 0, filterable: true, sortable: true },
  },
  {
    name: "amount",
    type: "number",
    required: true,
    ui: { order: 1, filterable: true, sortable: true },
  },
];

describe("planEntityIndexesFromDraft", () => {
  it("returns null when entity name is empty", () => {
    expect(
      planEntityIndexesFromDraft({
        name: "",
        label: "Contract",
        fields: baseFields,
      }),
    ).toBeNull();
  });

  it("plans fewer indexes when inMemoryListQueries is enabled", () => {
    const full = planEntityIndexesFromDraft({
      name: "tag",
      label: "Tag",
      fields: baseFields,
      navIcon: "Tag",
    });
    const minimal = planEntityIndexesFromDraft({
      name: "tag",
      label: "Tag",
      fields: baseFields,
      inMemoryListQueries: true,
      navIcon: "Tag",
    });

    expect(full?.summary.total).toBeGreaterThan(minimal?.summary.total ?? 0);
    expect(minimal?.summary.sortOnly).toBe(0);
    expect(minimal?.summary.filterOnly).toBe(0);
  });

  it("plans indexes for a draft entity", () => {
    const plan = planEntityIndexesFromDraft({
      name: "contract",
      label: "Contract",
      fields: baseFields,
      navIcon: "FileText",
    });

    expect(plan).not.toBeNull();
    expect(plan?.entityName).toBe("contract");
    expect(plan?.summary.total).toBeGreaterThan(0);
    expect(plan?.summary.ownershipBaseline).toBe(1);
  });
});

describe("computeFieldIndexContribution", () => {
  it("reports marginal indexes from filterable and sortable flags", () => {
    const input = {
      name: "contract",
      label: "Contract",
      fields: baseFields,
      navIcon: "FileText",
    };

    expect(computeFieldIndexContribution(input, 0)).toBe(3);
    expect(formatFieldIndexContribution(3)).toBe("+3");
    expect(formatFieldIndexContribution(null)).toBe("—");
  });
});
