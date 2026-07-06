import { describe, expect, it } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  buildManyToOneRelationLoadPlans,
  resolveManyToOneSubfieldValue,
} from "./many-to-one-relation-subfield-values.js";

const paymentScheduleDefinition = {
  name: "paymentSchedule",
  collection: "paymentSchedules",
  permissions: [],
  fields: {
    financialItemId: {
      type: "reference",
      required: true,
      optional: false,
      relation: { type: "many-to-one", target: "financialItem" },
    },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
} as SerializableEntityDefinition;

const financialItemDefinition = {
  name: "financialItem",
  collection: "financialItems",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    actorId: {
      type: "reference",
      required: false,
      optional: true,
      relation: { type: "many-to-one", target: "actor" },
    },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
} as SerializableEntityDefinition;

const actorDefinition = {
  name: "actor",
  collection: "actors",
  permissions: [],
  fields: {
    logo: { type: "image", required: false, optional: true },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
} as SerializableEntityDefinition;

const getDefinition = (entityName: string) => {
  if (entityName === "financialItem") {
    return financialItemDefinition;
  }
  if (entityName === "actor") {
    return actorDefinition;
  }
  return undefined;
};

describe("buildManyToOneRelationLoadPlans", () => {
  it("includes nested many-to-one relations for multi-hop field paths", () => {
    expect(
      buildManyToOneRelationLoadPlans(paymentScheduleDefinition, getDefinition),
    ).toEqual([
      {
        relationField: "financialItemId",
        targetEntity: "financialItem",
        parentRelationField: null,
      },
      {
        relationField: "actorId",
        targetEntity: "actor",
        parentRelationField: "financialItemId",
      },
    ]);
  });
});

describe("resolveManyToOneSubfieldValue", () => {
  it("resolves nested actor logo values from loaded relation maps", () => {
    const logoRef = {
      storagePath: "actors/logo.png",
      fileName: "logo.png",
      contentType: "image/png",
    };

    const targetRecordsByRelation = new Map<
      string,
      ReadonlyMap<string, Record<string, unknown>>
    >([
      [
        "financialItemId",
        new Map([
          [
            "fi_1",
            {
              id: "fi_1",
              actorId: "actor_1",
            },
          ],
        ]),
      ],
      [
        "actorId",
        new Map([
          [
            "actor_1",
            {
              id: "actor_1",
              logo: logoRef,
            },
          ],
        ]),
      ],
    ]);

    expect(
      resolveManyToOneSubfieldValue(
        {
          id: "ps_1",
          financialItemId: "fi_1",
        },
        "financialItem.actor.logo",
        paymentScheduleDefinition,
        targetRecordsByRelation,
        getDefinition,
      ),
    ).toEqual(logoRef);
  });

  it("resolves nested actor logo values from populated records on loaded relations", () => {
    const logoRef = {
      storagePath: "actors/logo.png",
      fileName: "logo.png",
      contentType: "image/png",
    };

    expect(
      resolveManyToOneSubfieldValue(
        {
          id: "ps_1",
          financialItemId: "fi_1",
          _populated: {
            financialItemId: {
              id: "fi_1",
              actorId: "actor_1",
              _populated: {
                actorId: {
                  id: "actor_1",
                  logo: logoRef,
                },
              },
            },
          },
        },
        "financialItem.actor.logo",
        paymentScheduleDefinition,
        new Map(),
        getDefinition,
      ),
    ).toEqual(logoRef);
  });
});
