import { describe, expect, it } from "vitest";
import {
  createScreenRootNode,
  isContainerComponent,
} from "@repo/ui-builder-core";

import {
  createAppShellRootChildrenLayout,
  resolveAppShellRootContainerRow,
} from "./app-shell-root-container";

describe("resolveAppShellRootContainerRow", () => {
  it("returns the single root container", () => {
    const layout = {
      root: createScreenRootNode([
        {
          type: "component" as const,
          id: "app-footer-shell",
          name: "Footer",
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

    const root = resolveAppShellRootContainerRow(layout);
    expect(root?.id).toBe("app-footer-shell");
    expect(root && isContainerComponent(root.component)).toBe(true);
  });

  it("returns null when root is not a single container", () => {
    const layout = {
      root: createScreenRootNode([
        {
          type: "component" as const,
          id: "tab",
          component: {
            kind: "nav-tab" as const,
            iconName: "Home",
            to: "/",
          },
        },
      ]),
      showActions: false,
    };

    expect(resolveAppShellRootContainerRow(layout)).toBeNull();
  });
});

describe("createAppShellRootChildrenLayout", () => {
  it("lifts container children to screen-root with row auto tracks", () => {
    const root = {
      type: "component" as const,
      id: "app-footer-shell",
      component: {
        kind: "container" as const,
        stackDirection: "row" as const,
        rows: [
          {
            type: "component" as const,
            id: "a",
            component: {
              kind: "nav-tab" as const,
              iconName: "Home",
              to: "/",
            },
          },
          {
            type: "component" as const,
            id: "b",
            component: {
              kind: "nav-tab" as const,
              iconName: "User",
              to: "/profile",
            },
          },
        ],
      },
    };

    const children = createAppShellRootChildrenLayout(root);
    expect(children.root.type).toBe("screen-root");
    if (children.root.type !== "screen-root") {
      return;
    }
    expect(children.root.rows).toHaveLength(2);
    expect(children.root.gridTemplateColumns).toBe("repeat(2, auto)");
  });
});
