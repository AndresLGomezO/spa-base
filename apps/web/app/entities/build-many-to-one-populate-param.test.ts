import { describe, expect, it } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import { buildManyToOnePopulateParam } from "./build-many-to-one-populate-param.js";

describe("buildManyToOnePopulateParam", () => {
  it("returns comma-separated many-to-one relation field names", () => {
    const definition = {
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
        dueDate: { type: "date", required: true, optional: false },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    expect(buildManyToOnePopulateParam(definition)).toBe("financialItemId");
  });
});
