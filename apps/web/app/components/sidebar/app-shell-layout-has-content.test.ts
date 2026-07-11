import { describe, expect, it } from "vitest";
import { createScreenRootNode } from "@repo/ui-builder-core";

import { appShellLayoutHasContent } from "./app-shell-layout-has-content";

describe("appShellLayoutHasContent", () => {
  it("returns false for an empty container shell", () => {
    expect(
      appShellLayoutHasContent({
        root: createScreenRootNode([
          {
            type: "component",
            id: "shell",
            component: {
              kind: "container",
              stackDirection: "row",
              rows: [],
            },
          },
        ]),
        showActions: false,
      }),
    ).toBe(false);
  });

  it("returns true when a leaf component is present", () => {
    expect(
      appShellLayoutHasContent({
        root: createScreenRootNode([
          {
            type: "component",
            id: "shell",
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
    ).toBe(true);
  });
});
