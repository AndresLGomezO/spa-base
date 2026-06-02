import { describe, expect, it } from "vitest";

import {
  computeAvgFieldsFromValues,
  mergeAvgFieldsIntoValues,
} from "./avg-values.js";

describe("computeAvgFieldsFromValues", () => {
  it("computes avg from sum and count pairs", () => {
    expect(
      computeAvgFieldsFromValues({
        sum_amount: 1500,
        count_amount: 3,
      }),
    ).toEqual({ avg_amount: 500 });
  });

  it("returns zero avg when count is zero", () => {
    expect(
      computeAvgFieldsFromValues({
        sum_amount: 100,
        count_amount: 0,
      }),
    ).toEqual({ avg_amount: 0 });
  });

  it("ignores document count without sum pair", () => {
    expect(computeAvgFieldsFromValues({ count: 5 })).toEqual({});
  });
});

describe("mergeAvgFieldsIntoValues", () => {
  it("merges avg fields into existing values", () => {
    expect(
      mergeAvgFieldsIntoValues({
        sum_amount: 10,
        count_amount: 2,
        count: 1,
      }),
    ).toEqual({
      sum_amount: 10,
      count_amount: 2,
      count: 1,
      avg_amount: 5,
    });
  });
});
