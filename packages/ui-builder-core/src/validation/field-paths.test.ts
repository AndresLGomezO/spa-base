import { describe, expect, it } from "vitest";

import type { FieldPathValidationDefinition } from "./field-paths.js";
import {
  collectLayoutFieldPaths,
  collectLayoutInputFieldPaths,
  isValidLayoutFieldPath,
  isValidEntityFieldSelectorFieldPath,
  isValidTableColumnFieldPath,
  layoutHasInputFields,
  listEntityFieldSelectorFieldOptions,
  listFormFieldOptions,
  listLayoutFieldOptions,
  normalizeTableColumnFieldPath,
  relationAliasFieldPath,
  sanitizeTableColumnFieldPaths,
} from "./field-paths.js";
import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "../builder/mutations.js";

const accountDefinition: FieldPathValidationDefinition = {
  name: "account",
  fields: {
    name: {},
    balance: {},
    bankId: {
      relation: { type: "many-to-one", target: "bank" },
    },
    currencyId: {
      relation: { type: "many-to-one", target: "currency" },
    },
  },
};

describe("listLayoutFieldOptions", () => {
  it("includes relation display paths and excludes fk fields", () => {
    const options = listLayoutFieldOptions(accountDefinition);
    expect(options).toContain("bank.name");
    expect(options).not.toContain("bankId");
    expect(options).not.toContain("bank.logo");
  });

  it("includes logo only when the target entity defines a logo field", () => {
    const options = listLayoutFieldOptions(accountDefinition, {
      resolveTarget: (target): FieldPathValidationDefinition | undefined => {
        if (target === "bank") {
          return {
            name: "bank",
            fields: {
              name: {},
              code: {},
              logo: {},
              openedAt: { type: "date" },
            },
          };
        }
        if (target === "currency") {
          return {
            name: "currency",
            fields: {
              name: {},
              code: {},
            },
          };
        }
        return undefined;
      },
    });

    expect(options).toContain("bank.logo");
    expect(options).toContain("bank.openedAt");
    expect(options).not.toContain("currency.logo");
  });

  it("includes one-to-many child field paths", () => {
    const options = listLayoutFieldOptions(
      {
        name: "contract",
        fields: {
          name: {},
          contractTerms: {
            relation: { type: "one-to-many", target: "contractTerms" },
          },
        },
      },
      {
        resolveTarget: (target): FieldPathValidationDefinition | undefined => {
          if (target === "contractTerms") {
            return {
              name: "contractTerms",
              fields: {
                effectiveDate: { type: "date" },
              },
            };
          }
          return undefined;
        },
      },
    );

    expect(options).toContain("contractTerms.effectiveDate");
  });

  it("includes implicit reverse one-to-many paths from catalog", () => {
    const contractTermsDefinition: FieldPathValidationDefinition = {
      name: "contractTerms",
      fields: {
        contractId: {
          relation: { type: "many-to-one", target: "contract" },
        },
        effectiveDate: { type: "date" },
      },
    };

    const options = listLayoutFieldOptions(
      {
        name: "contract",
        fields: {
          name: {},
        },
      },
      {
        resolveTarget: (target) =>
          target === "contractTerms" ? contractTermsDefinition : undefined,
        catalog: [contractTermsDefinition],
      },
    );

    expect(options).toContain("contractTerms.effectiveDate");
    expect(options).not.toContain("contractId.effectiveDate");
  });

  it("dedupes misnamed explicit one-to-many field paths to child entity name", () => {
    const contractTermsDefinition: FieldPathValidationDefinition = {
      name: "contractTerms",
      fields: {
        contractId: {
          relation: { type: "many-to-one", target: "contract" },
        },
        effectiveDate: { type: "date" },
      },
    };

    const options = listLayoutFieldOptions(
      {
        name: "contract",
        fields: {
          name: {},
          contractTermses: {
            relation: { type: "one-to-many", target: "contractTerms" },
          },
        },
      },
      {
        resolveTarget: (target) =>
          target === "contractTerms" ? contractTermsDefinition : undefined,
        catalog: [contractTermsDefinition],
      },
    );

    expect(options).toContain("contractTerms.effectiveDate");
    expect(options).not.toContain("contractTermses.effectiveDate");
  });

  it("skips reverse paths when explicit one-to-many to the same child exists", () => {
    const contractTermsDefinition: FieldPathValidationDefinition = {
      name: "contractTerms",
      fields: {
        contractId: {
          relation: { type: "many-to-one", target: "contract" },
        },
        effectiveDate: { type: "date" },
        endDate: { type: "date" },
      },
    };

    const options = listLayoutFieldOptions(
      {
        name: "contract",
        fields: {
          contractTerms: {
            relation: { type: "one-to-many", target: "contractTerms" },
          },
        },
      },
      {
        resolveTarget: (target) =>
          target === "contractTerms" ? contractTermsDefinition : undefined,
        catalog: [contractTermsDefinition],
      },
    );

    expect(options).toContain("contractTerms.effectiveDate");
    expect(options).toContain("contractTerms.endDate");
    expect(
      options.filter((path) => path === "contractTerms.effectiveDate"),
    ).toHaveLength(1);
  });
});

describe("listFormFieldOptions", () => {
  it("includes relation fk fields and scalar fields", () => {
    const options = listFormFieldOptions(accountDefinition);
    expect(options).toContain("name");
    expect(options).toContain("balance");
    expect(options).toContain("bankId");
    expect(options).toContain("currencyId");
    expect(options).not.toContain("bank.name");
  });
});

describe("relationAliasFieldPath", () => {
  it("normalizes relation paths to target alias", () => {
    expect(relationAliasFieldPath(accountDefinition, "bankId.logo")).toBe(
      "bank.logo",
    );
    expect(relationAliasFieldPath(accountDefinition, "bank.logo")).toBe(
      "bank.logo",
    );
    expect(relationAliasFieldPath(accountDefinition, "name")).toBe("name");
  });
});

describe("isValidLayoutFieldPath", () => {
  it("accepts relation subfields", () => {
    expect(isValidLayoutFieldPath(accountDefinition, "bankId.logo")).toBe(true);
    expect(isValidLayoutFieldPath(accountDefinition, "bank.logo")).toBe(true);
  });

  it("accepts one-to-many child field paths", () => {
    expect(
      isValidLayoutFieldPath(
        {
          name: "contract",
          fields: {
            contractTerms: {
              relation: { type: "one-to-many", target: "contractTerms" },
            },
          },
        },
        "contractTerms.effectiveDate",
        {
          resolveTarget: (target) =>
            target === "contractTerms"
              ? {
                  name: "contractTerms",
                  fields: { effectiveDate: { type: "date" } },
                }
              : undefined,
        },
      ),
    ).toBe(true);
  });
});

describe("table column field paths", () => {
  it("rejects relation display paths for table columns", () => {
    expect(isValidTableColumnFieldPath(accountDefinition, "bank.name")).toBe(
      false,
    );
    expect(isValidTableColumnFieldPath(accountDefinition, "bankId")).toBe(true);
  });

  it("normalizes relation display paths to FK field names", () => {
    expect(normalizeTableColumnFieldPath(accountDefinition, "bank.name")).toBe(
      "bankId",
    );
  });

  it("sanitizes table column lists to top-level queryable fields", () => {
    expect(
      sanitizeTableColumnFieldPaths(accountDefinition, [
        "name",
        "bank.name",
        "missing",
      ]),
    ).toEqual(["name", "bankId"]);
  });
});

const selectorDefinition: FieldPathValidationDefinition = {
  name: "contract",
  fields: {
    bankId: {
      type: "relation",
      relation: { type: "many-to-one", target: "bank" },
    },
    providerIds: {
      type: "relation",
      relation: { type: "many-to-many", target: "provider" },
    },
    childRecords: {
      type: "relation",
      relation: { type: "one-to-many", target: "child" },
    },
    status: { type: "enum" },
    notes: { type: "string" },
  },
};

describe("isValidEntityFieldSelectorFieldPath", () => {
  it("accepts relation FK, many-to-many, and enum fields", () => {
    expect(
      isValidEntityFieldSelectorFieldPath(selectorDefinition, "bankId"),
    ).toBe(true);
    expect(
      isValidEntityFieldSelectorFieldPath(selectorDefinition, "providerIds"),
    ).toBe(true);
    expect(
      isValidEntityFieldSelectorFieldPath(selectorDefinition, "status"),
    ).toBe(true);
  });

  it("rejects one-to-many relations and non-selector field types", () => {
    expect(
      isValidEntityFieldSelectorFieldPath(selectorDefinition, "childRecords"),
    ).toBe(false);
    expect(
      isValidEntityFieldSelectorFieldPath(selectorDefinition, "notes"),
    ).toBe(false);
  });
});

describe("listEntityFieldSelectorFieldOptions", () => {
  it("lists only eligible selector fields", () => {
    const options = listEntityFieldSelectorFieldOptions(selectorDefinition);
    expect(options).toEqual(["bankId", "providerIds", "status"]);
  });
});

describe("collectLayoutInputFieldPaths", () => {
  it("collects only editable form slots", () => {
    const locator = { scope: "root" as const, columnIndex: 0 };
    let layout = createEmptyLayout(1);
    layout = addComponentRowAt(
      layout,
      locator,
      createDefaultComponent("form-field", "name"),
    );
    layout = addComponentRowAt(
      layout,
      locator,
      createDefaultComponent("text", "bank.name"),
    );
    layout = addComponentRowAt(
      layout,
      locator,
      createDefaultComponent("entity-field-selector", "status"),
    );

    expect(collectLayoutInputFieldPaths(layout)).toEqual(["name", "status"]);
    expect(collectLayoutFieldPaths(layout)).toEqual([
      "name",
      "bank.name",
      "status",
    ]);
    expect(layoutHasInputFields(layout)).toBe(true);
  });
});
