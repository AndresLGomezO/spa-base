import { describe, expect, it } from "vitest";
import { createScreenRootNode } from "@repo/ui-builder-core";

import { resolveAppShellChromeDisplayClassName } from "./app-shell-chrome-display";

describe("resolveAppShellChromeDisplayClassName", () => {
  it("returns flex for full-range root containers", () => {
    expect(
      resolveAppShellChromeDisplayClassName({
        root: createScreenRootNode([
          {
            type: "component",
            id: "app-header-bar",
            component: {
              kind: "container",
              stackDirection: "row",
              rows: [],
            },
          },
        ]),
        showActions: false,
      }),
    ).toBe("flex");
  });

  it("applies mobile-only media classes in production", () => {
    expect(
      resolveAppShellChromeDisplayClassName({
        root: createScreenRootNode([
          {
            type: "component",
            id: "app-header-bar",
            displayFrom: "base",
            displayTo: "base",
            component: {
              kind: "container",
              stackDirection: "row",
              rows: [
                {
                  type: "component",
                  id: "trigger",
                  component: {
                    kind: "sidebar-trigger",
                    iconName: "PanelLeft",
                  },
                },
              ],
            },
          },
        ]),
        showActions: false,
      }),
    ).toBe("hidden max-sm:flex");
  });

  it("snaps mobile-only visibility for designer preview breakpoints", () => {
    const layout = {
      root: createScreenRootNode([
        {
          type: "component" as const,
          id: "app-footer-shell",
          displayFrom: "base" as const,
          displayTo: "base" as const,
          component: {
            kind: "container" as const,
            stackDirection: "row" as const,
            rows: [
              {
                type: "component" as const,
                id: "tab",
                component: {
                  kind: "nav-tab" as const,
                  iconName: "Home",
                  to: "/",
                },
              },
            ],
          },
        },
      ]),
      showActions: false,
    };

    expect(resolveAppShellChromeDisplayClassName(layout, "base")).toBe("flex");
    expect(resolveAppShellChromeDisplayClassName(layout, "md")).toBe("hidden");
  });
});
