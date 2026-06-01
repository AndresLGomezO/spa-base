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
