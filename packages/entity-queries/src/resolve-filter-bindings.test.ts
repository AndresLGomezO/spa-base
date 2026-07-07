import { describe, expect, it } from "vitest";

import { resolveFilterBindingSource } from "./resolve-filter-bindings.js";

describe("resolveFilterBindingSource", () => {
  it("resolves dashboardDateFilter binding", () => {
    expect(
      resolveFilterBindingSource(
        { type: "dashboardDateFilter" },
        {
          dashboardDateFilter: {
            value: "2026-06",
            granularity: "month",
            param: "month",
          },
        },
      ),
    ).toBe("2026-06");
  });

  it("resolves relativePeriod with dashboard anchor", () => {
    expect(
      resolveFilterBindingSource(
        {
          type: "relativePeriod",
          field: "date",
          anchor: "dashboardDateFilter",
          offset: -1,
          unit: "month",
        },
        {
          dashboardDateFilter: {
            value: "2026-06",
            granularity: "month",
            param: "month",
          },
        },
      ),
    ).toBe("2026-05");
  });

  it("resolves static string list bindings", () => {
    expect(
      resolveFilterBindingSource(
        {
          type: "static",
          value: ["INCOME", "EXPENSE"],
        },
        {},
      ),
    ).toEqual(["INCOME", "EXPENSE"]);
  });

  it("resolves nested entityField bindings from populated relations", () => {
    expect(
      resolveFilterBindingSource(
        { type: "entityField", fieldPath: "category.id" },
        {
          record: {
            id: "txn-1",
            categoryId: "cat-1",
            _populated: {
              categoryId: {
                id: "cat-1",
                name: "Food",
              },
            },
          },
        },
      ),
    ).toBe("cat-1");
  });
});
