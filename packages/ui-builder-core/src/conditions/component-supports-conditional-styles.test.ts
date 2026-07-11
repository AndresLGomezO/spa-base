import { describe, expect, it } from "vitest";

import {
  entityBoundComponentSupportsConditionalStyles,
  fieldComponentSupportsConditionalStyles,
  resolveDefaultCompareFieldPath,
} from "./component-supports-conditional-styles.js";

describe("entityBoundComponentSupportsConditionalStyles", () => {
  it("includes layout and stylable entity-bound components", () => {
    expect(entityBoundComponentSupportsConditionalStyles("container")).toBe(
      true,
    );
    expect(entityBoundComponentSupportsConditionalStyles("grid")).toBe(true);
    expect(entityBoundComponentSupportsConditionalStyles("icon")).toBe(true);
    expect(entityBoundComponentSupportsConditionalStyles("metric-kpi")).toBe(
      true,
    );
  });

  it("excludes wizard-only and page-level components", () => {
    expect(
      entityBoundComponentSupportsConditionalStyles("wizard-progress"),
    ).toBe(false);
    expect(entityBoundComponentSupportsConditionalStyles("page-header")).toBe(
      false,
    );
  });
});

describe("fieldComponentSupportsConditionalStyles", () => {
  it("returns true for supported field kinds", () => {
    expect(fieldComponentSupportsConditionalStyles("text")).toBe(true);
    expect(fieldComponentSupportsConditionalStyles("date")).toBe(true);
    expect(fieldComponentSupportsConditionalStyles("badge")).toBe(true);
  });

  it("returns false for non-field kinds", () => {
    expect(fieldComponentSupportsConditionalStyles("metric-kpi")).toBe(false);
    expect(fieldComponentSupportsConditionalStyles("icon")).toBe(false);
  });
});

describe("resolveDefaultCompareFieldPath", () => {
  it("returns primary field path for field components", () => {
    expect(
      resolveDefaultCompareFieldPath({
        kind: "text",
        primary: { type: "field", path: "dueDate" },
      }),
    ).toBe("dueDate");
  });

  it("returns form-field path", () => {
    expect(
      resolveDefaultCompareFieldPath({
        kind: "form-field",
        fieldPath: "status",
      }),
    ).toBe("status");
  });

  it("returns undefined for containers", () => {
    expect(
      resolveDefaultCompareFieldPath({
        kind: "container",
        rows: [],
      }),
    ).toBeUndefined();
  });
});
