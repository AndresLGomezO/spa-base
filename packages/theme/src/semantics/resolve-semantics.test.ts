import { describe, expect, it } from "vitest";

import {
  appearanceToCssVariables,
  type TenantAppearanceLike,
} from "../tenant-overrides.js";
import {
  expandAppearanceSemantics,
  isSemanticCssVar,
} from "./resolve-semantics.js";

describe("expandAppearanceSemantics", () => {
  it("maps semantics object keys to CSS variables", () => {
    const vars = expandAppearanceSemantics({
      semantics: {
        "--color-card": "#ffffff",
        "--color-background": "#fafafa",
      },
    });

    expect(vars["--color-card"]).toBe("#ffffff");
    expect(vars["--color-background"]).toBe("#fafafa");
  });

  it("extracts semantic overrides from legacy colors map", () => {
    const vars = expandAppearanceSemantics({
      colors: {
        "--color-primary": "#0095f6",
        "--color-primary-500": "#0095f6",
      },
    });

    expect(vars["--color-primary"]).toBe("#0095f6");
    expect(vars["--color-primary-500"]).toBeUndefined();
  });
});

describe("isSemanticCssVar", () => {
  it("recognizes overridable semantic tokens", () => {
    expect(isSemanticCssVar("--color-card")).toBe(true);
    expect(isSemanticCssVar("color-hover")).toBe(true);
    expect(isSemanticCssVar("--color-primary-500")).toBe(false);
  });
});

describe("appearanceToCssVariables with preset", () => {
  it("applies soft preset palettes and resolves light semantics from scales", () => {
    const vars = appearanceToCssVariables({ preset: "soft" });

    expect(vars["--color-primary-500"]).toBe("#2563eb");
    expect(vars["--color-foreground"]).toBe(vars["--color-neutral-950"]);
    expect(vars["--color-background"]).toBe(vars["--color-neutral-50"]);
    expect(vars["--color-card"]).toBe("#ffffff");
    expect(vars["--color-muted-foreground"]).toBe(vars["--color-neutral-500"]);
  });

  it("resolves dark semantics from palette scales when colorScheme is dark", () => {
    const vars = appearanceToCssVariables(
      { preset: "soft" },
      { colorScheme: "dark" },
    );

    expect(vars["--color-foreground"]).toBe(vars["--color-neutral-50"]);
    expect(vars["--color-background"]).toBe(vars["--color-neutral-950"]);
    expect(vars["--color-card"]).toBe(vars["--color-neutral-900"]);
  });

  it("omits dark-remapped semantics when colorScheme is dark", () => {
    const vars = appearanceToCssVariables(
      {
        semantics: {
          "--color-background": "#ffffff",
          "--color-foreground": "#111111",
          "--color-primary": "#ff0000",
        },
      },
      { colorScheme: "dark" },
    );

    expect(vars["--color-background"]).toBeUndefined();
    expect(vars["--color-foreground"]).toBeUndefined();
    expect(vars["--color-primary"]).toBe("#ff0000");
  });

  it("maps legacy instagram preset id to soft", () => {
    const vars = appearanceToCssVariables({
      preset: "instagram",
    } as unknown as TenantAppearanceLike);

    expect(vars["--color-primary-500"]).toBe("#2563eb");
  });

  it("lets explicit palette overrides win over preset base", () => {
    const vars = appearanceToCssVariables({
      preset: "bold",
      palettes: {
        primary: { anchorStep: "600", anchorColor: "#e1306c" },
      },
    });

    expect(vars["--color-primary-600"]).toBe("#e1306c");
  });

  it("inlines dark semantics for scoped preview without custom palettes", () => {
    const lightVars = appearanceToCssVariables(
      {},
      { colorScheme: "light", scopedPreview: true },
    );
    const darkVars = appearanceToCssVariables(
      {},
      { colorScheme: "dark", scopedPreview: true },
    );

    expect(lightVars["--color-background"]).toBe("#f7f7f8");
    expect(darkVars["--color-background"]).toBe("#18181b");
    expect(lightVars["--color-background"]).not.toBe(
      darkVars["--color-background"],
    );
  });
});
