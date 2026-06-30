import { describe, expect, it } from "vitest";

import {
  componentKindsForSurface,
  isComponentKindAllowedOnSurface,
} from "./design-surface.js";

describe("formPlain surface", () => {
  it("allows display component kinds", () => {
    for (const kind of [
      "text",
      "image",
      "icon",
      "date",
      "numeric",
      "badge",
    ] as const) {
      expect(isComponentKindAllowedOnSurface(kind, "formPlain")).toBe(true);
      expect(componentKindsForSurface("formPlain")).toContain(kind);
    }
  });

  it("still allows editable form slots", () => {
    expect(isComponentKindAllowedOnSurface("form-field", "formPlain")).toBe(
      true,
    );
    expect(
      isComponentKindAllowedOnSurface("entity-field-selector", "formPlain"),
    ).toBe(true);
  });
});
