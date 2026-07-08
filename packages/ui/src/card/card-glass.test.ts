import { describe, expect, it } from "vitest";

import {
  cardGlassSurfaceClasses,
  cardOpaqueSurfaceClasses,
} from "./card-glass.js";

describe("card-glass", () => {
  it("uses tenant backdrop filter token for glass surfaces", () => {
    expect(cardGlassSurfaceClasses).toContain(
      "[backdrop-filter:var(--backdrop-filter-card)]",
    );
    expect(cardGlassSurfaceClasses).toContain(
      "[-webkit-backdrop-filter:var(--backdrop-filter-card)]",
    );
  });

  it("uses opaque card tokens by default", () => {
    expect(cardOpaqueSurfaceClasses).toContain("bg-card");
    expect(cardOpaqueSurfaceClasses).not.toContain("backdrop-filter");
  });
});
