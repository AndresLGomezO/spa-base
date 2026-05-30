import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import {
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

describe("entity-form-payload", () => {
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
});
