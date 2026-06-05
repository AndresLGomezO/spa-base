import { describe, expect, it } from "vitest";
import {
  createDefaultFormLayout,
  createDefaultModalFooterLayout,
  createDefaultWizardShellLayout,
  findLayoutComponent,
} from "@repo/ui-builder-core";

describe("findLayoutComponent", () => {
  it("finds the first matching component kind in a layout", () => {
    const layout = createDefaultWizardShellLayout();
    const actions = findLayoutComponent(layout, "wizard-actions");
    expect(actions?.kind).toBe("wizard-actions");
  });

  it("returns undefined when the kind is missing", () => {
    const layout = createDefaultFormLayout(["name"]);
    expect(findLayoutComponent(layout, "form-actions")).toBeUndefined();
  });
});

describe("createDefaultModalFooterLayout", () => {
  it("seeds a footer layout with the requested action kind", () => {
    const layout = createDefaultModalFooterLayout("wizard-actions");
    expect(findLayoutComponent(layout, "wizard-actions")?.kind).toBe(
      "wizard-actions",
    );
  });
});
