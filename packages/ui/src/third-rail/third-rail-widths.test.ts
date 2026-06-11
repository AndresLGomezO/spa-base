import { describe, expect, it } from "vitest";

import { resolveThirdRailWidthClasses } from "./third-rail-widths";

describe("resolveThirdRailWidthClasses", () => {
  it("returns default responsive width classes", () => {
    expect(resolveThirdRailWidthClasses()).toBe("w-full md:w-1/2 lg:w-1/4");
  });

  it("applies custom overrides per breakpoint", () => {
    expect(
      resolveThirdRailWidthClasses({
        base: "full",
        md: "1/3",
        lg: "1/5",
      }),
    ).toBe("w-full md:w-1/3 lg:w-1/5");
  });

  it("merges partial overrides with defaults", () => {
    expect(resolveThirdRailWidthClasses({ lg: "1/3" })).toBe(
      "w-full md:w-1/2 lg:w-1/3",
    );
  });
});
