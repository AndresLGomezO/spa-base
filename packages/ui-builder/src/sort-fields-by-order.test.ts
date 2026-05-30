import { describe, expect, it } from "vitest";

import { sortFieldsByUiOrder } from "./sort-fields-by-order.js";

describe("sortFieldsByUiOrder", () => {
  it("sorts fields by ui order metadata", () => {
    expect(
      sortFieldsByUiOrder(["amount", "status", "name"], {
        amount: { order: 2 },
        status: { order: 0 },
        name: { order: 1 },
      }),
    ).toEqual(["status", "name", "amount"]);
  });

  it("preserves original order when order metadata is missing", () => {
    expect(sortFieldsByUiOrder(["name", "email", "isActive"], {})).toEqual([
      "name",
      "email",
      "isActive",
    ]);
  });

  it("uses original index as tiebreaker for equal orders", () => {
    expect(
      sortFieldsByUiOrder(["name", "email", "isActive"], {
        name: { order: 1 },
        email: { order: 1 },
        isActive: { order: 1 },
      }),
    ).toEqual(["name", "email", "isActive"]);
  });
});
