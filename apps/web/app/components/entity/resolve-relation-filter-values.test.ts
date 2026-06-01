import { describe, expect, it } from "vitest";

import { resolveRelationFilterValues } from "./resolve-relation-filter-values";

describe("resolveRelationFilterValues", () => {
  const definition = {
    name: "account",
    collection: "accounts",
    permissions: [],
    fields: {
      accountTypeId: {
        type: "relation",
        required: true,
        optional: false,
        relation: { target: "accountType", type: "many-to-one" },
      },
      name: { type: "string", required: true, optional: false },
    },
    ui: {
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
    },
  };

  it("maps display labels to stored relation ids", () => {
    expect(
      resolveRelationFilterValues(
        { accountTypeId: ["Digital Wallet"] },
        definition,
        {
          accountTypeId: [
            { value: "atype_wallet", label: "Digital Wallet" },
            { value: "atype_bank", label: "Bank Account" },
          ],
        },
      ),
    ).toEqual({ accountTypeId: ["atype_wallet"] });
  });

  it("keeps values that already match option ids", () => {
    expect(
      resolveRelationFilterValues(
        { accountTypeId: ["atype_wallet"] },
        definition,
        {
          accountTypeId: [{ value: "atype_wallet", label: "Digital Wallet" }],
        },
      ),
    ).toEqual({ accountTypeId: ["atype_wallet"] });
  });
});
