import { describe, expect, it } from "vitest";
import type { DesignSurface } from "@repo/ui-builder-core";
import { resolveCompositionScope } from "@repo/ui-builder-core";

const SURFACE_EXPECTATIONS: ReadonlyArray<{
  surface: DesignSurface;
  scope: ReturnType<typeof resolveCompositionScope>;
}> = [
  { surface: "mainPage", scope: "screen" },
  { surface: "dashboardLayout", scope: "screen" },
  { surface: "listItem", scope: "block" },
  { surface: "metricWidget", scope: "component" },
  { surface: "formWizardStep", scope: "section" },
];

describe("resolveCompositionScope", () => {
  it.each(SURFACE_EXPECTATIONS)(
    "maps $surface to $scope",
    ({ surface, scope }) => {
      expect(resolveCompositionScope(surface)).toBe(scope);
    },
  );
});
