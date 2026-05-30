import { describe, expect, it } from "vitest";

import {
  isDocumentStoredField,
  isDocumentStoredFieldConfig,
  isJoinCollectionRelationField,
} from "./is-document-stored-field.js";

describe("isDocumentStoredField", () => {
  it("returns true for non-relation fields", () => {
    expect(isDocumentStoredField({ type: "string" })).toBe(true);
  });

  it("returns true for many-to-one and one-to-one relations", () => {
    expect(
      isDocumentStoredField({
        type: "relation",
        relation: { type: "many-to-one" },
      }),
    ).toBe(true);
    expect(
      isDocumentStoredField({
        type: "relation",
        relation: { type: "one-to-one" },
      }),
    ).toBe(true);
  });

  it("returns false for many-to-many and one-to-many relations", () => {
    expect(
      isDocumentStoredField({
        type: "relation",
        relation: { type: "many-to-many" },
      }),
    ).toBe(false);
    expect(
      isDocumentStoredField({
        type: "relation",
        relation: { type: "one-to-many" },
      }),
    ).toBe(false);
  });
});

describe("isDocumentStoredFieldConfig", () => {
  it("matches isDocumentStoredField for relation configs", () => {
    expect(
      isDocumentStoredFieldConfig({
        type: "relation",
        relation: { target: "loan", type: "many-to-one" },
      }),
    ).toBe(true);
    expect(
      isDocumentStoredFieldConfig({
        type: "relation",
        relation: { target: "loan", type: "many-to-many" },
      }),
    ).toBe(false);
  });
});

describe("isJoinCollectionRelationField", () => {
  it("identifies many-to-many relation fields", () => {
    expect(
      isJoinCollectionRelationField({
        type: "relation",
        relation: { type: "many-to-many" },
      }),
    ).toBe(true);
    expect(
      isJoinCollectionRelationField({
        type: "relation",
        relation: { type: "many-to-one" },
      }),
    ).toBe(false);
  });
});
