import { describe, expect, it } from "vitest";

import { buildFieldSchema } from "./buildFieldSchema.js";

describe("buildFieldSchema number fields", () => {
  it("rejects non-integer values for integer numberKind", () => {
    const schema = buildFieldSchema(
      { type: "number", numberKind: "integer", required: true },
      "full",
    );

    expect(schema.safeParse(1.5).success).toBe(false);
    expect(schema.safeParse(2).success).toBe(true);
  });

  it("allows fractional values for decimal numberKind", () => {
    const schema = buildFieldSchema(
      { type: "number", numberKind: "decimal", required: true },
      "full",
    );

    expect(schema.safeParse(1.5).success).toBe(true);
  });
});

describe("buildFieldSchema array fields", () => {
  it("validates required string arrays", () => {
    const schema = buildFieldSchema(
      { type: "string", isArray: true, required: true },
      "full",
    );

    expect(schema.safeParse(["tag1", "tag2"]).success).toBe(true);
    expect(schema.safeParse([]).success).toBe(false);
    expect(schema.safeParse("tag1").success).toBe(false);
  });

  it("validates optional enum arrays", () => {
    const schema = buildFieldSchema(
      {
        type: "enum",
        isArray: true,
        enumValues: ["a", "b"],
      },
      "create",
    );

    expect(schema.safeParse(["a"]).success).toBe(true);
    expect(schema.safeParse(undefined).success).toBe(true);
    expect(schema.safeParse(["invalid"]).success).toBe(false);
  });
});
