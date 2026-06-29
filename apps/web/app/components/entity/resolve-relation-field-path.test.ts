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
      relationKind: "many-to-one",
    });
  });
});

describe("parseRelationFieldPath one-to-many", () => {
  const contractDefinition = {
    name: "contract",
    collection: "contracts",
    permissions: [],
    fields: {
      contractTerms: {
        type: "relation",
        required: false,
        optional: true,
        relation: { type: "one-to-many", target: "contractTerms" },
      },
    },
    ui: {
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
      fields: {},
    },
  } as SerializableEntityDefinition;

  const contractTermsDefinition = {
    name: "contractTerms",
    collection: "contract_terms",
    permissions: [],
    fields: {
      contractId: {
        type: "relation",
        required: true,
        optional: false,
        relation: { type: "many-to-one", target: "contract" },
      },
      effectiveDate: { type: "date", required: true, optional: false },
    },
    ui: {
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
      fields: {},
    },
  } as SerializableEntityDefinition;

  const lookup = (name: string) =>
    name === "contractTerms" ? contractTermsDefinition : undefined;

  it("parses explicit one-to-many child paths", () => {
    expect(
      parseRelationFieldPath(
        contractDefinition,
        "contractTerms.effectiveDate",
        lookup,
      ),
    ).toEqual({
      relationField: "contractTerms",
      subField: "effectiveDate",
      relationKind: "one-to-many",
    });
  });
});
