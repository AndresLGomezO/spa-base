import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "./types.js";
import {
  isValidCardLayoutFieldPath,
  listCardLayoutFieldOptions,
  relationAliasFieldPath,
} from "./card-layout-validation.js";

const accountDefinition = {
  name: "account",
  collection: "accounts",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    bankId: {
      type: "reference",
      required: false,
      optional: true,
      relation: { type: "many-to-one", target: "bank" },
    },
    balance: { type: "number", required: true, optional: false },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
} as SerializableEntityDefinition;

describe("listCardLayoutFieldOptions", () => {
  it("lists relation subpaths once using the target alias", () => {
    const options = listCardLayoutFieldOptions(accountDefinition);

    expect(options).toContain("bank.logo");
    expect(options).toContain("bank.name");
    expect(options).not.toContain("bankId.logo");
    expect(options).not.toContain("bankId");
  });
});

describe("relationAliasFieldPath", () => {
  it("maps FK-prefixed relation paths to alias form", () => {
    expect(relationAliasFieldPath(accountDefinition, "bankId.logo")).toBe(
      "bank.logo",
    );
    expect(relationAliasFieldPath(accountDefinition, "bank.logo")).toBe(
      "bank.logo",
    );
    expect(relationAliasFieldPath(accountDefinition, "name")).toBe("name");
  });
});

describe("isValidCardLayoutFieldPath", () => {
  it("accepts both FK and alias relation paths", () => {
    expect(isValidCardLayoutFieldPath(accountDefinition, "bankId.logo")).toBe(
      true,
    );
    expect(isValidCardLayoutFieldPath(accountDefinition, "bank.logo")).toBe(
      true,
    );
  });
});
