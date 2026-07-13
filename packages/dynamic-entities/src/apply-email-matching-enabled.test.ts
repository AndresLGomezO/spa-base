import { describe, expect, it } from "vitest";

import { applyEmailMatchingEnabled } from "./apply-email-matching-enabled.js";

describe("applyEmailMatchingEnabled", () => {
  it("sets emailMatchingEnabled when true", () => {
    expect(
      applyEmailMatchingEnabled<{
        label: string;
        emailMatchingEnabled?: boolean;
      }>({ label: "Item" }, true),
    ).toEqual({
      label: "Item",
      emailMatchingEnabled: true,
    });
  });

  it("removes emailMatchingEnabled when false", () => {
    expect(
      applyEmailMatchingEnabled(
        { label: "Item", emailMatchingEnabled: true },
        false,
      ),
    ).toEqual({ label: "Item" });
  });

  it("leaves the record unchanged when undefined", () => {
    expect(
      applyEmailMatchingEnabled(
        { label: "Item", emailMatchingEnabled: true },
        undefined,
      ),
    ).toEqual({ label: "Item", emailMatchingEnabled: true });
  });
});
