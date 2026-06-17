import { describe, expect, it } from "vitest";

import { applyDescription } from "./apply-description.js";

describe("applyDescription", () => {
  it("sets description when provided", () => {
    expect(
      applyDescription<{ label: string; description?: string }>(
        { label: "Loans" },
        "Short summary",
      ),
    ).toEqual({
      label: "Loans",
      description: "Short summary",
    });
  });

  it("removes description when cleared", () => {
    expect(
      applyDescription({ label: "Loans", description: "Old summary" }, null),
    ).toEqual({ label: "Loans" });
  });

  it("removes description when blank", () => {
    expect(
      applyDescription({ label: "Loans", description: "Old summary" }, "  "),
    ).toEqual({ label: "Loans" });
  });
});
