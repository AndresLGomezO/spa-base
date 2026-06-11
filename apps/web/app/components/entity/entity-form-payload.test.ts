import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import {
  buildFormSubmitValues,
  getJoinRelationFieldNames,
  splitEntityFormPayload,
} from "./entity-form-payload";

const definition = {
  name: "source",
  collection: "sources",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    otherModels: {
      type: "relation",
      required: false,
      optional: true,
      relation: { target: "otherModel", type: "many-to-many" },
    },
    parentItems: {
      type: "relation",
      required: false,
      optional: true,
      relation: { target: "item", type: "one-to-many" },
    },
    otherModelId: {
      type: "relation",
      required: false,
      optional: true,
      relation: { target: "otherModel", type: "many-to-one" },
    },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
  },
} satisfies SerializableEntityDefinition;

const contractLikeDefinition = {
  name: "contract",
  collection: "contracts",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    description: { type: "string", required: false, optional: true },
    tags: { type: "string", required: false, optional: true, isArray: true },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
  },
} satisfies SerializableEntityDefinition;

describe("entity-form-payload", () => {
  it("builds wizard submit values from layout field roots", () => {
    expect(
      buildFormSubmitValues(
        [
          {
            fields: [
              "name",
              "description",
              "tags",
              "description",
              "providerId",
            ],
          },
        ],
        {
          name: "Loan",
          description: "Longer text",
          tags: ["essential", "utilities"],
          providerId: "prov_1",
          status: "",
        },
      ),
    ).toEqual({
      name: "Loan",
      description: "Longer text",
      tags: ["essential", "utilities"],
      providerId: "prov_1",
    });
  });

  it("includes optional wizard fields in the create payload", () => {
    const submitValues = buildFormSubmitValues(
      [{ fields: ["name", "description", "tags"] }],
      {
        name: "Loan",
        description: "Product notes",
        tags: ["streaming"],
        currency: "USD",
      },
    );

    expect(
      splitEntityFormPayload(contractLikeDefinition, submitValues),
    ).toEqual({
      documentPayload: {
        name: "Loan",
        description: "Product notes",
        tags: ["streaming"],
      },
      joinRelations: {},
    });
  });

  it("identifies join relation field names", () => {
    expect(getJoinRelationFieldNames(definition)).toEqual(["otherModels"]);
  });

  it("splits document and join relation payloads", () => {
    expect(
      splitEntityFormPayload(definition, {
        name: "Example",
        otherModels: ["om_1", "om_2"],
        parentItems: "should-not-send",
        otherModelId: "om_1",
      }),
    ).toEqual({
      documentPayload: {
        name: "Example",
        otherModelId: "om_1",
      },
      joinRelations: {
        otherModels: ["om_1", "om_2"],
      },
    });
  });

  it("excludes display cache from submit payload", () => {
    expect(
      buildFormSubmitValues([{ fields: ["name", "bankId", "_populated"] }], {
        name: "Loan",
        bankId: "bank_1",
        _populated: {
          bankId: { id: "bank_1", name: "First Bank" },
        },
      }),
    ).toEqual({
      name: "Loan",
      bankId: "bank_1",
    });

    expect(
      splitEntityFormPayload(definition, {
        name: "Example",
        otherModelId: "om_1",
        _populated: {
          otherModelId: { id: "om_1", name: "Other" },
        },
      }),
    ).toEqual({
      documentPayload: {
        name: "Example",
        otherModelId: "om_1",
      },
      joinRelations: {},
    });
  });
});
