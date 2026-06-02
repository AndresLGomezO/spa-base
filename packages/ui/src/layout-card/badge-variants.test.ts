import { describe, expect, it } from "vitest";

import { resolveBadgeVariant } from "./badge-variants.js";

describe("resolveBadgeVariant", () => {
  it("matches raw and display values case-insensitively", () => {
    const variantMap = {
      ACTIVE: "success",
      closed: "danger",
    } as const;

    expect(resolveBadgeVariant("status_active", variantMap, "ACTIVE")).toBe(
      "success",
    );
    expect(resolveBadgeVariant("CLOSED", variantMap, "Closed")).toBe("danger");
    expect(resolveBadgeVariant("unknown", variantMap, "Unknown")).toBe(
      "default",
    );
  });
});
