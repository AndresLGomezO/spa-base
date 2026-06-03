import { describe, expect, it } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  listLayoutBindingFieldPaths,
  resolveLayoutFieldBinding,
} from "./resolve-entity-layout-field-binding";

const accountDefinition = {
  name: "account",
  collection: "accounts",
  permissions: [],
  fields: {
    bankId: {
      type: "reference",
      required: false,
      optional: true,
      relation: { type: "many-to-one", target: "bank" },
    },
    providerId: {
      type: "reference",
      required: false,
      optional: true,
      relation: { type: "many-to-one", target: "provider" },
    },
    name: { type: "string", required: true },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
} as SerializableEntityDefinition;

describe("listLayoutBindingFieldPaths", () => {
  it("returns primary field first and skips duplicate fallbacks", () => {
    expect(
      listLayoutBindingFieldPaths("bankId.logo", [
        "providerId.logo",
        "bankId.logo",
      ]),
    ).toEqual(["bankId.logo", "providerId.logo"]);
  });
});

describe("resolveLayoutFieldBinding", () => {
  it("uses the primary field when it has a value", () => {
    const item = {
      id: "acc-1",
      bankId: "bank-1",
      _populated: {
        bankId: {
          logo: {
            downloadUrl: "https://example.com/bank.png",
          },
        },
      },
    };

    const resolved = resolveLayoutFieldBinding({
      item,
      fieldPath: "bankId.logo",
      fallbackFieldPaths: ["providerId.logo"],
      component: "image",
      definition: accountDefinition,
      getOneToManyCellValue: () => null,
    });

    expect(resolved.fieldPath).toBe("bankId.logo");
    expect(resolved.rawValue).toEqual({
      downloadUrl: "https://example.com/bank.png",
    });
  });

  it("falls back to the next field when the primary relation is empty", () => {
    const item = {
      id: "acc-1",
      bankId: null,
      providerId: "provider-1",
      _populated: {
        providerId: {
          logo: {
            downloadUrl: "https://example.com/provider.png",
          },
        },
      },
    };

    const resolved = resolveLayoutFieldBinding({
      item,
      fieldPath: "bankId.logo",
      fallbackFieldPaths: ["providerId.logo"],
      component: "image",
      definition: accountDefinition,
      getOneToManyCellValue: () => null,
    });

    expect(resolved.fieldPath).toBe("providerId.logo");
    expect(resolved.rawValue).toEqual({
      downloadUrl: "https://example.com/provider.png",
    });
  });

  it("falls back for text fields when the primary value is blank", () => {
    const item = {
      id: "acc-1",
      bankId: "bank-1",
      _populated: {
        bankId: { name: "   " },
        providerId: { name: "Fallback Bank" },
      },
    };

    const resolved = resolveLayoutFieldBinding({
      item,
      fieldPath: "bankId.name",
      fallbackFieldPaths: ["providerId.name"],
      component: "text",
      definition: accountDefinition,
      getOneToManyCellValue: () => null,
    });

    expect(resolved.fieldPath).toBe("providerId.name");
    expect(resolved.rawValue).toBe("Fallback Bank");
  });
});
