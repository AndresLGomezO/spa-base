import { describe, expect, it } from "vitest";

import { resolveTemplatePlaceholders } from "./resolve-template-placeholders.js";

describe("resolveTemplatePlaceholders", () => {
  it("resolves entity field placeholders", () => {
    expect(
      resolveTemplatePlaceholders("Hello {{entity.name}}", {
        entity: { name: "Acme" },
      }),
    ).toBe("Hello Acme");
  });

  it("resolves metric placeholders", () => {
    expect(
      resolveTemplatePlaceholders("{{metric.value}}", {
        metric: { value: 42 },
      }),
    ).toBe("42");
  });
});
