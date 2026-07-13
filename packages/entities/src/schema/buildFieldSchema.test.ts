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

  it("validates optional document arrays", () => {
    const schema = buildFieldSchema(
      { type: "document", isArray: true },
      "create",
    );

    expect(schema.safeParse([]).success).toBe(true);
    expect(schema.safeParse(undefined).success).toBe(true);
    expect(
      schema.safeParse([
        {
          storagePath: "tenants/t1/entity-files/item/doc-id.pdf",
          contentType: "application/pdf",
          fileName: "statement.pdf",
        },
      ]).success,
    ).toBe(true);
    expect(
      schema.safeParse([
        {
          storagePath: "tenants/t1/entity-files/item/doc-id.png",
          contentType: "image/png",
          fileName: "photo.png",
        },
      ]).success,
    ).toBe(false);
  });

  it("validates optional image arrays", () => {
    const schema = buildFieldSchema({ type: "image", isArray: true }, "create");

    expect(schema.safeParse([]).success).toBe(true);
    expect(schema.safeParse(undefined).success).toBe(true);
    expect(
      schema.safeParse([
        {
          storagePath: "tenants/t1/entity-files/item/photo-id.png",
          contentType: "image/png",
          fileName: "photo.png",
        },
      ]).success,
    ).toBe(true);
    expect(
      schema.safeParse([
        {
          storagePath: "tenants/t1/entity-files/item/doc-id.pdf",
          contentType: "application/pdf",
          fileName: "statement.pdf",
        },
      ]).success,
    ).toBe(false);
  });
});

describe("buildFieldSchema optional nullability", () => {
  it("accepts null and undefined for optional relation foreign keys", () => {
    const schema = buildFieldSchema(
      {
        type: "relation",
        relation: {
          target: "account",
          type: "many-to-one",
          onDelete: "nullify",
        },
      },
      "create",
    );

    expect(schema.safeParse(undefined).success).toBe(true);
    expect(schema.safeParse(null).success).toBe(true);
    expect(schema.safeParse("acct_1").success).toBe(true);
    expect(schema.safeParse("").success).toBe(false);
  });

  it("rejects null for required relation foreign keys", () => {
    const schema = buildFieldSchema(
      {
        type: "relation",
        required: true,
        relation: {
          target: "account",
          type: "many-to-one",
          onDelete: "restrict",
        },
      },
      "create",
    );

    expect(schema.safeParse(null).success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(false);
    expect(schema.safeParse("acct_1").success).toBe(true);
  });
});
