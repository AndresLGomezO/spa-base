import { describe, expect, it } from "vitest";

import {
  intersectsFields,
  metricMatchesEvent,
  recordMatchesFilters,
} from "./filter.js";

describe("recordMatchesFilters", () => {
  it("matches eq filter", () => {
    expect(
      recordMatchesFilters({ status: "open" }, [
        { field: "status", op: "eq", value: "open" },
      ]),
    ).toBe(true);
  });

  it("matches in filter", () => {
    expect(
      recordMatchesFilters({ categoryId: "food" }, [
        { field: "categoryId", op: "in", value: ["food", "travel"] },
      ]),
    ).toBe(true);
  });
});

describe("metricMatchesEvent", () => {
  it("matches create without field intersection", () => {
    expect(
      metricMatchesEvent(
        {
          sourceModel: "transaction",
          fieldsDependency: ["amount"],
          status: "ACTIVE",
        },
        {
          model: "transaction",
          changedFields: [],
          operation: "CREATE",
        },
      ),
    ).toBe(true);
  });

  it("requires field intersection on update", () => {
    expect(
      metricMatchesEvent(
        {
          sourceModel: "transaction",
          fieldsDependency: ["amount"],
          status: "ACTIVE",
        },
        {
          model: "transaction",
          changedFields: ["note"],
          operation: "UPDATE",
        },
      ),
    ).toBe(false);
  });
});

describe("intersectsFields", () => {
  it("detects overlap", () => {
    expect(intersectsFields(["a", "b"], ["b", "c"])).toBe(true);
  });
});

describe("document COUNT metrics", () => {
  it("matches UPDATE events for filter-boundary handling", () => {
    expect(
      metricMatchesEvent(
        {
          sourceModel: "transaction",
          fieldsDependency: [],
          status: "ACTIVE",
          aggregations: [{ operation: "COUNT" }],
        },
        {
          model: "transaction",
          changedFields: ["note"],
          operation: "UPDATE",
        },
      ),
    ).toBe(true);
  });
});
