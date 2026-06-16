import { describe, expect, it } from "vitest";

import { listFiltersForEntity } from "./list-filters-for-entity";

describe("listFiltersForEntity", () => {
  it("maps qualified page filters to entity field names", () => {
    expect(
      listFiltersForEntity("account", {
        "account.accountType": ["BANK"],
        "transaction.status": ["pending"],
      }),
    ).toEqual({
      accountType: ["BANK"],
    });
  });

  it("keeps unqualified keys for backward compatibility", () => {
    expect(
      listFiltersForEntity("account", {
        accountType: ["BANK"],
      }),
    ).toEqual({
      accountType: ["BANK"],
    });
  });
});
