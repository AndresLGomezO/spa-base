import { describe, expect, it } from "vitest";

import {
  exportEntityFormState,
  importEntityFormState,
} from "./export-entity-form-state";

describe("export-entity-form-state", () => {
  it("round-trips wizard form state including navIcon", () => {
    const exported = exportEntityFormState({
      name: "loan",
      label: "Loans",
      description: "Loan records",
      fields: [{ name: "amount", type: "number", required: true }],
      tenantWideRead: true,
      inMemoryListQueries: false,
      hiddenFromNav: false,
      emailMatchingEnabled: true,
      navCategoryId: "cat_1",
      navOrder: "2",
      navIcon: "Wallet",
      displayField: "amount",
    });

    expect(exported.navIcon).toBe("Wallet");
    expect(exported.navOrder).toBe(2);
    expect(exported.emailMatchingEnabled).toBe(true);

    const imported = importEntityFormState(exported);
    expect(imported).toEqual({
      name: "loan",
      label: "Loans",
      description: "Loan records",
      fields: [{ name: "amount", type: "number", required: true }],
      tenantWideRead: true,
      inMemoryListQueries: false,
      hiddenFromNav: false,
      emailMatchingEnabled: true,
      navCategoryId: "cat_1",
      navOrder: "2",
      navIcon: "Wallet",
      displayField: "amount",
    });
  });
});
