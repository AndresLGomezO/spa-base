import { describe, expect, it } from "vitest";

import { appearanceToCssVariables } from "./tenant-overrides.js";

describe("appearanceToCssVariables hybrid merge", () => {
  it("prefers explicit dark semantics over palette defaults", () => {
    const vars = appearanceToCssVariables(
      {
        palettes: {
          neutral: { anchorStep: "50", anchorColor: "#f8fafc" },
        },
        semanticsByScheme: {
          dark: {
            "--color-background": "#0b0d14",
            "--color-accent-foreground": "#c7b8f3",
          },
        },
      },
      { colorScheme: "dark" },
    );

    expect(vars["--color-background"]).toBe("#0b0d14");
    expect(vars["--color-accent-foreground"]).toBe("#c7b8f3");
  });

  it("applies scheme-specific sidebar colors in dark mode", () => {
    const vars = appearanceToCssVariables(
      {
        palettes: {
          neutral: { anchorStep: "950", anchorColor: "#0b0d14" },
        },
        colors: {
          "--color-sidebar": "#ffffff",
        },
        colorsByScheme: {
          dark: {
            "--color-sidebar": "#0b0d14",
            "--color-sidebar-accent": "#1e1466",
          },
        },
      },
      { colorScheme: "dark" },
    );

    expect(vars["--color-sidebar"]).toBe("#0b0d14");
    expect(vars["--color-sidebar-accent"]).toBe("#1e1466");
  });

  it("maps layout fields to radius, spacing scale, and effect tokens", () => {
    const vars = appearanceToCssVariables(
      {
        radius: "1rem",
        radiusSm: "0.5rem",
        spacingScale: {
          xs: "0.25rem",
          sm: "0.5rem",
          md: "1rem",
          base: "1.5rem",
          lg: "2rem",
        },
        effects: {
          shadowCard: {
            light: "0px 4px 20px rgba(0, 0, 0, 0.03)",
          },
          gradientPrimary: {
            dark: "linear-gradient(135deg, #422db3 0%, #1e1466 100%)",
          },
        },
        chartColors: {
          chart1: "#6B4EFF",
        },
      },
      { colorScheme: "light" },
    );

    expect(vars["--radius-lg"]).toBe("1rem");
    expect(vars["--radius-sm"]).toBe("0.5rem");
    expect(vars["--spacing-macro"]).toBe("1.5rem");
    expect(vars["--spacing-comfortable"]).toBe("1rem");
    expect(vars["--spacing"]).toBeUndefined();
    expect(vars["--shadow-card"]).toContain("4px 20px");
    expect(vars["--color-chart-1"]).toBe("#6B4EFF");

    const darkVars = appearanceToCssVariables(
      {
        effects: {
          gradientPrimary: {
            dark: "linear-gradient(135deg, #422db3 0%, #1e1466 100%)",
          },
        },
      },
      { colorScheme: "dark" },
    );

    expect(darkVars["--gradient-primary"]).toContain("#422db3");
  });

  it("maps legacy spacing to --spacing-macro without overriding Tailwind multiplier", () => {
    const vars = appearanceToCssVariables({ spacing: "1.5rem" });

    expect(vars["--spacing-macro"]).toBe("1.5rem");
    expect(vars["--spacing"]).toBeUndefined();
  });
});
