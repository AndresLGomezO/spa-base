import { describe, expect, it } from "vitest";

import {
  applyDisplayFieldToRecord,
  displayFieldForCreate,
} from "./apply-display-field-patch.js";

describe("displayFieldForCreate", () => {
  it("returns displayField when set", () => {
    expect(displayFieldForCreate({ displayField: "title" })).toEqual({
      displayField: "title",
    });
  });

  it("returns empty when omitted", () => {
    expect(displayFieldForCreate({})).toEqual({});
  });
});

describe("applyDisplayFieldToRecord", () => {
  it("sets displayField from patch", () => {
    expect(
      applyDisplayFieldToRecord({ label: "Loans" }, { displayField: "name" }),
    ).toEqual({ label: "Loans", displayField: "name" });
  });

  it("clears displayField when patch is null", () => {
    expect(
      applyDisplayFieldToRecord(
        { label: "Loans", displayField: "name" },
        { displayField: null },
      ),
    ).toEqual({ label: "Loans" });
  });

  it("preserves displayField when patch omits displayField", () => {
    expect(
      applyDisplayFieldToRecord({ label: "Loans", displayField: "name" }, {}),
    ).toEqual({ label: "Loans", displayField: "name" });
  });
});
