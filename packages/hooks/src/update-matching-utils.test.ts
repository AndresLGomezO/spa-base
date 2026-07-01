import { describe, expect, it } from "vitest";

import {
  findUpdateMatchingLookupLeaf,
  hasUpdateMatchingLookupLeaf,
} from "./update-matching-utils.js";

describe("update matching utils", () => {
  it("finds the first == leaf with a value expression", () => {
    const leaf = findUpdateMatchingLookupLeaf({
      type: "group",
      combinator: "and",
      children: [
        {
          type: "condition",
          field: "status",
          operator: "==",
          value: { kind: "literal", value: "UPCOMING" },
        },
        {
          type: "condition",
          field: "contractId",
          operator: "==",
          value: { kind: "literal", value: "loan_1" },
        },
      ],
    });

    expect(leaf?.field).toBe("status");
  });

  it("accepts legacy typeless lookup leaves", () => {
    expect(
      hasUpdateMatchingLookupLeaf({
        field: "contractId",
        operator: "==",
        value: { kind: "literal", value: "loan_1" },
      }),
    ).toBe(true);
  });

  it("rejects trees without lookup leaves", () => {
    expect(
      hasUpdateMatchingLookupLeaf({
        type: "condition",
        field: "status",
        operator: "isEmpty",
      }),
    ).toBe(false);
  });
});
