import { describe, expect, it } from "vitest";

import {
  createTenantThemeSkeleton,
  EXAMPLE_VIOLET_DASHBOARD_THEME_JSON,
  exportTenantTheme,
  importTenantTheme,
  validateTenantThemeImport,
} from "./theme-import-export.js";
import { appearanceToCssVariables } from "./tenant-overrides.js";

describe("theme import/export", () => {
  it("round-trips the example violet dashboard theme", () => {
    const imported = importTenantTheme(EXAMPLE_VIOLET_DASHBOARD_THEME_JSON);
    const exported = exportTenantTheme(imported);
    const reimported = importTenantTheme(exported);

    expect(reimported.palettes?.primary?.anchorColor).toBe("#6B4EFF");
    expect(reimported.semanticsByScheme?.light?.["--color-primary"]).toBe(
      "#6B4EFF",
    );
    expect(reimported.semanticsByScheme?.dark?.["--color-accent"]).toBe(
      "#1e1466",
    );
    expect(reimported.colorsByScheme?.dark?.["--color-sidebar"]).toBe(
      "#0b0d14",
    );
    expect(reimported.effects?.shadowCard?.light).toContain("4px 20px");
    expect(reimported.chartColors?.chart2).toBe("#10b981");
    expect(reimported.radiusSm).toBe("0.5rem");
    expect(reimported.spacingScale?.base).toBe("1.5rem");
    expect(reimported.spacingScale?.md).toBe("1rem");
    expect(reimported.customTokens).toEqual([
      {
        kind: "color",
        name: "widget",
        label: "Widget surface",
        light: "#ffffff",
        dark: "#1a1a2e",
      },
      {
        kind: "gradient",
        name: "hero",
        light: "linear-gradient(135deg, #8c6fe6 0%, #553cd9 100%)",
        dark: "linear-gradient(135deg, #422db3 0%, #1e1466 100%)",
      },
    ]);
  });

  it("applies imported theme variables for both color schemes", () => {
    const appearance = importTenantTheme(EXAMPLE_VIOLET_DASHBOARD_THEME_JSON);

    const lightVars = appearanceToCssVariables(appearance, {
      colorScheme: "light",
    });
    const darkVars = appearanceToCssVariables(appearance, {
      colorScheme: "dark",
    });

    expect(lightVars["--color-primary"]).toBe("#6B4EFF");
    expect(lightVars["--shadow-card"]).toContain("4px 20px");
    expect(lightVars["--gradient-primary"]).toContain("8c6fe6");
    expect(lightVars["--color-chart-1"]).toBe("#6B4EFF");
    expect(lightVars["--radius-lg"]).toBe("1rem");
    expect(lightVars["--radius-sm"]).toBe("0.5rem");
    expect(lightVars["--spacing-macro"]).toBe("1.5rem");
    expect(lightVars["--spacing"]).toBeUndefined();
    expect(lightVars["--color-sidebar-accent"]).toBe("#f3f0ff");
    expect(lightVars["--color-widget"]).toBe("#ffffff");
    expect(lightVars["--gradient-hero"]).toContain("8c6fe6");

    expect(darkVars["--color-background"]).toBe("#0b0d14");
    expect(darkVars["--shadow-card"]).toBe("none");
    expect(darkVars["--color-sidebar"]).toBe("#0b0d14");
    expect(darkVars["--color-accent-foreground"]).toBe("#c7b8f3");
    expect(darkVars["--color-widget"]).toBe("#1a1a2e");
    expect(darkVars["--gradient-hero"]).toContain("422db3");
  });

  it("exports legacy flat semantics into the light section", () => {
    const exported = exportTenantTheme({
      semantics: {
        "--color-card": "#ffffff",
        "--color-badge-success": "#dcfce7",
      },
      colors: {
        "--color-sidebar": "#ffffff",
      },
    });
    const parsed = JSON.parse(exported) as {
      semantics?: { light?: Record<string, string> };
      badges?: { light?: Record<string, string> };
      sidebar?: { light?: Record<string, string> };
    };

    expect(parsed.semantics?.light?.["--color-card"]).toBe("#ffffff");
    expect(parsed.badges?.light?.["--color-badge-success"]).toBe("#dcfce7");
    expect(parsed.sidebar?.light?.["--color-sidebar"]).toBe("#ffffff");
  });

  it("imports legacy layout.spacing as spacingScale.base", () => {
    const imported = importTenantTheme(
      JSON.stringify({
        version: 1,
        layout: { spacing: "1.5rem" },
      }),
    );

    expect(imported.spacingScale?.base).toBe("1.5rem");
    expect(imported.spacing).toBeUndefined();
  });

  it("validates theme JSON and exposes structured errors", () => {
    expect(validateTenantThemeImport("")).toEqual({ ok: false, errors: [] });
    expect(validateTenantThemeImport("{")).toEqual({
      ok: false,
      errors: [{ path: "$", message: "Invalid JSON syntax." }],
    });

    const valid = validateTenantThemeImport(createTenantThemeSkeleton());
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.palettes?.primary?.anchorColor).toBe("#6B4EFF");
    }
  });
});
