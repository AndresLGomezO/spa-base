import { describe, expect, it } from "vitest";

import { applyHiddenFromNav } from "./apply-hidden-from-nav.js";

describe("applyHiddenFromNav", () => {
  it("sets hiddenFromNav when enabled", () => {
    expect(
      applyHiddenFromNav<{ label: string; hiddenFromNav?: boolean }>(
        { label: "Status" },
        true,
      ),
    ).toEqual({
      label: "Status",
      hiddenFromNav: true,
    });
  });

  it("removes hiddenFromNav when disabled", () => {
    expect(
      applyHiddenFromNav({ label: "Status", hiddenFromNav: true }, false),
    ).toEqual({ label: "Status" });
  });
});
