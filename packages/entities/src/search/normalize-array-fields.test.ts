import { describe, expect, it } from "vitest";

import { defineEntity } from "../defineEntity.js";
import type { DefinedEntity, FieldDefinitions } from "../types.js";
import { normalizeArrayFieldValues } from "./normalize-array-fields.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const TaggedEntity = defineEntity({
  name: "tagged",
  fields: {
    tags: { type: "string", isArray: true, required: true },
    counts: { type: "number", isArray: true },
    labels: {
      type: "enum",
      isArray: true,
      enumValues: ["a", "b"],
    },
  },
}) as unknown as AnyDefinedEntity;

describe("normalizeArrayFieldValues", () => {
  it("normalizes string and enum array elements to lowercase", () => {
    expect(
      normalizeArrayFieldValues(TaggedEntity, {
        tags: [" Tag-One ", "BETA"],
        labels: ["A", "B"],
        counts: [1, 2],
      }),
    ).toEqual({
      tags: ["tag-one", "beta"],
      labels: ["a", "b"],
      counts: [1, 2],
    });
  });

  it("removes empty string arrays", () => {
    expect(
      normalizeArrayFieldValues(TaggedEntity, {
        tags: ["  ", ""],
      }),
    ).toEqual({});
  });
});
