import { describe, expect, it } from "vitest";

import { resolveFieldChain } from "./data-source.js";

describe("resolveFieldChain", () => {
  it("uses first field with a present value", () => {
    const result = resolveFieldChain({
      primary: { type: "field", path: "name" },
      fallbacks: [{ type: "field", path: "code" }],
      kind: "text",
      resolveField: (path) => (path === "code" ? "fallback" : ""),
    });

    expect(result.fieldPath).toBe("code");
    expect(result.rawValue).toBe("fallback");
  });

  it("returns static text when configured", () => {
    const result = resolveFieldChain({
      primary: { type: "static", value: "No data" },
      kind: "text",
      resolveField: () => null,
    });

    expect(result.usedStatic).toBe(true);
    expect(result.staticValue).toBe("No data");
  });
});
