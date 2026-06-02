import { describe, expect, it } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import { resolveEntityFieldPath } from "./resolve-entity-field-path";

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
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
} as SerializableEntityDefinition;

describe("resolveEntityFieldPath", () => {
  it("reads nested fields via relation target alias bank.name", () => {
    expect(
      resolveEntityFieldPath(
        {
          id: "acc_1",
          bankId: "bank_bogota",
          _populated: {
            bankId: { id: "bank_bogota", name: "Banco de Bogotá" },
          },
        },
        "bank.name",
        accountDefinition,
        () => null,
      ),
    ).toBe("Banco de Bogotá");
  });
});
