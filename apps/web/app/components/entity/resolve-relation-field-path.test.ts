import { describe, expect, it } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  parseRelationFieldPath,
  resolveRelationFieldName,
} from "./resolve-relation-field-path";

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

describe("resolveRelationFieldName", () => {
  it("resolves FK field and target entity alias", () => {
    expect(resolveRelationFieldName(accountDefinition, "bankId")).toBe(
      "bankId",
    );
    expect(resolveRelationFieldName(accountDefinition, "bank")).toBe("bankId");
  });
});

describe("parseRelationFieldPath", () => {
  it("parses bank.name as bankId.name", () => {
    expect(parseRelationFieldPath(accountDefinition, "bank.name")).toEqual({
      relationField: "bankId",
      subField: "name",
    });
  });
});
