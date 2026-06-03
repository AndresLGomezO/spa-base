import { describe, expect, it } from "vitest";

import type { FieldPathValidationDefinition } from "./field-paths.js";
import {
  isValidLayoutFieldPath,
  listFormFieldOptions,
  listLayoutFieldOptions,
  relationAliasFieldPath,
} from "./field-paths.js";

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
    expect(options).not.toContain("currency.logo");
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
});
