import { describe, expect, it } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  listQueryableFieldPaths,
  parseQueryableRelationPath,
  resolveQueryableFieldMeta,
} from "./relation-field-path.js";

type TestEntityFields = {
  readonly [key: string]: {
    readonly type: string;
    readonly required: boolean;
    readonly optional?: boolean;
    readonly relation?: { readonly type: string; readonly target: string };
    readonly enumValues?: readonly string[];
  };
};

function makeDefinition(
  name: string,
  fields: TestEntityFields,
  label?: string,
): SerializableEntityDefinition {
  return {
    name,
    collection: name,
    permissions: [],
    fields: fields as SerializableEntityDefinition["fields"],
    ui: {
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
      fields: {},
      ...(label ? { nav: { label } } : {}),
    },
  };
}

const contractDefinition = makeDefinition("contract", {
  name: { type: "string", required: true },
  providerId: {
    type: "relation",
    required: true,
    relation: { type: "many-to-one", target: "provider" },
  },
});

const providerDefinition = makeDefinition("provider", {
  name: { type: "string", required: true },
  status: {
    type: "enum",
    required: true,
    enumValues: ["ACTIVE", "PAUSED"],
  },
});

const contractTermsDefinition = makeDefinition("contractTerms", {
  contractId: {
    type: "relation",
    required: true,
    relation: { type: "many-to-one", target: "contract" },
  },
  effectiveDate: { type: "date", required: true },
});

const catalog = [
  contractDefinition,
  providerDefinition,
  contractTermsDefinition,
];

describe("parseQueryableRelationPath", () => {
  it("parses many-to-one paths by target entity alias", () => {
    expect(
      parseQueryableRelationPath(contractDefinition, catalog, "provider.name"),
    ).toEqual({
      kind: "many-to-one",
      path: "provider.name",
      foreignKeyField: "providerId",
      targetEntity: "provider",
      subField: "name",
    });
  });

  it("parses reverse one-to-many child paths", () => {
    expect(
      parseQueryableRelationPath(
        contractDefinition,
        catalog,
        "contractTerms.effectiveDate",
      ),
    ).toEqual({
      kind: "one-to-many",
      path: "contractTerms.effectiveDate",
      childEntity: "contractTerms",
      foreignKeyField: "contractId",
      subField: "effectiveDate",
    });
  });
});

describe("listQueryableFieldPaths", () => {
  it("includes direct and relation grouped paths", () => {
    const paths = listQueryableFieldPaths(contractDefinition, catalog);
    expect(
      paths.some((path) => path.value === "name" && path.group === "direct"),
    ).toBe(true);
    expect(
      paths.some(
        (path) =>
          path.value === "contractTerms.effectiveDate" &&
          path.group === "relation",
      ),
    ).toBe(true);
    expect(
      paths.some(
        (path) => path.value === "provider.name" && path.group === "relation",
      ),
    ).toBe(true);
  });
});

describe("resolveQueryableFieldMeta", () => {
  it("returns child entity field metadata for relation paths", () => {
    expect(
      resolveQueryableFieldMeta(
        contractDefinition,
        catalog,
        "contractTerms.effectiveDate",
      ),
    ).toMatchObject({
      entityName: "contractTerms",
      fieldName: "effectiveDate",
      type: "date",
    });
  });
});
