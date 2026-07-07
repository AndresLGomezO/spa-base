import { createElement } from "react";
import { describe, expect, it } from "vitest";

import {
  filterOptionsByQuery,
  findOptionLabel,
  flattenSelectOptions,
  isGroupedOptions,
  parseSelectChildren,
} from "./select-options.js";

describe("select-options", () => {
  it("parses flat option children", () => {
    const options = parseSelectChildren([
      createElement("option", { value: "" }, "Select…"),
      createElement("option", { value: "a" }, "Option A"),
      createElement("option", { value: "b" }, "Option B"),
    ]);

    expect(isGroupedOptions(options)).toBe(false);
    expect(options).toEqual([
      { value: "", label: "Select…" },
      { value: "a", label: "Option A" },
      { value: "b", label: "Option B" },
    ]);
  });

  it("parses grouped option children", () => {
    const options = parseSelectChildren([
      createElement("option", { value: "" }, "Choose…"),
      createElement(
        "optgroup",
        { label: "Group A" },
        createElement("option", { value: "a1" }, "Alpha"),
      ),
      createElement(
        "optgroup",
        { label: "Group B" },
        createElement("option", { value: "b1" }, "Beta"),
      ),
    ]);

    expect(isGroupedOptions(options)).toBe(true);
    expect(options).toEqual([
      {
        label: "",
        options: [{ value: "", label: "Choose…" }],
      },
      {
        label: "Group A",
        options: [{ value: "a1", label: "Alpha" }],
      },
      {
        label: "Group B",
        options: [{ value: "b1", label: "Beta" }],
      },
    ]);
  });

  it("filters flat options by label substring", () => {
    const options = [
      { value: "marginTop", label: "Margin Top" },
      { value: "backgroundColor", label: "Background Color" },
    ];

    expect(filterOptionsByQuery(options, "margin")).toEqual([
      { value: "marginTop", label: "Margin Top" },
    ]);
  });

  it("filters grouped options and removes empty groups", () => {
    const options = [
      {
        label: "Direct",
        options: [
          { value: "name", label: "Name" },
          { value: "status", label: "Status" },
        ],
      },
      {
        label: "Relation",
        options: [{ value: "owner.name", label: "Owner Name" }],
      },
    ];

    expect(filterOptionsByQuery(options, "name")).toEqual([
      {
        label: "Direct",
        options: [{ value: "name", label: "Name" }],
      },
      {
        label: "Relation",
        options: [{ value: "owner.name", label: "Owner Name" }],
      },
    ]);
  });

  it("finds labels for selected values", () => {
    const options = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ];

    expect(findOptionLabel(options, "b")).toBe("Beta");
    expect(findOptionLabel(options, "missing")).toBe("missing");
  });

  it("flattens grouped options", () => {
    const options = [
      {
        label: "Group",
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
      },
    ];

    expect(flattenSelectOptions(options)).toEqual([
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ]);
  });
});
