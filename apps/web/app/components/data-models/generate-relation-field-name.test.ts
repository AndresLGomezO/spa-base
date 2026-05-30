import { describe, expect, it } from "vitest";

import { generateRelationFieldName } from "./generate-relation-field-name";

describe("generateRelationFieldName", () => {
  it("returns empty string when target is empty", () => {
    expect(generateRelationFieldName("", "many-to-one")).toBe("");
  });

  it("appends Id for many-to-one relations", () => {
    expect(generateRelationFieldName("loan", "many-to-one")).toBe("loanId");
    expect(generateRelationFieldName("customer", "many-to-one")).toBe(
      "customerId",
    );
  });

  it("appends Id for one-to-one relations", () => {
    expect(generateRelationFieldName("profile", "one-to-one")).toBe(
      "profileId",
    );
  });

  it("pluralizes target for one-to-many relations", () => {
    expect(generateRelationFieldName("loan", "one-to-many")).toBe("loans");
    expect(generateRelationFieldName("status", "one-to-many")).toBe("statuses");
  });

  it("pluralizes target for many-to-many relations", () => {
    expect(generateRelationFieldName("project", "many-to-many")).toBe(
      "projects",
    );
    expect(generateRelationFieldName("status", "many-to-many")).toBe(
      "statuses",
    );
  });
});
