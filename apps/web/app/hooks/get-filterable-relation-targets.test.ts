import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import { getFilterableRelationTargets } from "./get-filterable-relation-targets";

const definition = {
  name: "productTerm",
  collection: "productTerms",
  permissions: ["productTerm.read"],
  fields: {
    paymentFrequencyId: {
      type: "relation",
      required: false,
      optional: true,
      relation: {
        target: "frequency",
        type: "many-to-one",
        onDelete: "restrict",
      },
    },
    rateTypeId: {
      type: "relation",
      required: false,
      optional: true,
      relation: {
        target: "rateType",
        type: "many-to-one",
        onDelete: "restrict",
      },
    },
    totalPeriods: {
      type: "number",
      numberKind: "integer",
      required: false,
      optional: true,
    },
    notes: { type: "string", required: false, optional: true },
    tags: {
      type: "relation",
      required: false,
      optional: true,
      relation: { target: "tag", type: "one-to-many", onDelete: "restrict" },
    },
  },
  ui: {
    views: [
      {
        type: "table",
        name: "default",
        fields: [
          "paymentFrequencyId",
          "rateTypeId",
          "totalPeriods",
          "notes",
          "tags",
        ],
      },
    ],
    forms: {
      create: { sections: [{ fields: ["paymentFrequencyId"] }] },
      edit: { sections: [{ fields: ["paymentFrequencyId"] }] },
    },
    fields: {
      paymentFrequencyId: { filterable: true },
      rateTypeId: { filterable: true },
      totalPeriods: { filterable: true },
      notes: { filterable: false },
      tags: { filterable: true },
    },
  },
} as SerializableEntityDefinition;

describe("getFilterableRelationTargets", () => {
  it("includes all filterable many-to-one and one-to-one relation columns", () => {
    const columns = [
      { id: "paymentFrequencyId", filterable: true },
      { id: "rateTypeId", filterable: true },
      { id: "totalPeriods", filterable: true },
      { id: "notes", filterable: false },
      { id: "tags", filterable: true },
    ];

    expect(getFilterableRelationTargets(definition, columns)).toEqual([
      { columnId: "paymentFrequencyId", target: "frequency" },
      { columnId: "rateTypeId", target: "rateType" },
    ]);
  });

  it("returns empty when no filterable relation columns exist", () => {
    expect(
      getFilterableRelationTargets(definition, [
        { id: "totalPeriods", filterable: true },
        { id: "notes", filterable: true },
      ]),
    ).toEqual([]);
  });
});
