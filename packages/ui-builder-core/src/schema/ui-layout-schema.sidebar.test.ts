import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema sidebar", () => {
  it("parses sidebar-collapse component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      component: {
        kind: "sidebar-collapse",
        iconName: "PanelLeftClose",
        expandIconName: "PanelLeft",
        iconSize: 20,
      },
    }) as ComponentRowNode;

    expect(parsed.component).toMatchObject({
      kind: "sidebar-collapse",
      iconName: "PanelLeftClose",
      expandIconName: "PanelLeft",
      iconSize: 20,
    });
  });

  it("parses sidebar-nav with item templates", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-nav",
      component: {
        kind: "sidebar-nav",
        groupItem: {
          rows: [
            {
              type: "component",
              id: "group-icon",
              component: { kind: "icon", iconName: "Folder" },
            },
          ],
        },
        subgroupItem: { rows: [] },
        rawItem: {
          rows: [
            {
              type: "component",
              id: "raw-icon",
              component: { kind: "icon", iconName: "File" },
            },
          ],
        },
      },
    }) as ComponentRowNode;

    expect(parsed.component.kind).toBe("sidebar-nav");
    if (parsed.component.kind !== "sidebar-nav") {
      throw new Error("Expected sidebar-nav component");
    }
    expect(parsed.component.groupItem.rows).toHaveLength(1);
    expect(parsed.component.rawItem.rows).toHaveLength(1);
    expect(parsed.component.subgroupItem.rows).toHaveLength(0);
  });

  it("parses sidebar-trigger component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-trigger",
      component: {
        kind: "sidebar-trigger",
        iconName: "PanelLeft",
        iconSize: 20,
      },
    }) as ComponentRowNode;

    expect(parsed.component).toMatchObject({
      kind: "sidebar-trigger",
      iconName: "PanelLeft",
      iconSize: 20,
    });
  });

  it("parses nav-tab component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-tab",
      component: {
        kind: "nav-tab",
        iconName: "Home",
        label: "Home",
        to: "/",
        matchPath: "/home",
      },
    }) as ComponentRowNode;

    expect(parsed.component).toMatchObject({
      kind: "nav-tab",
      iconName: "Home",
      label: "Home",
      to: "/",
      matchPath: "/home",
    });
  });
});
