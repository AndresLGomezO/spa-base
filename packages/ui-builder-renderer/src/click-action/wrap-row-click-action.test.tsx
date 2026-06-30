import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ComponentRowNode } from "@repo/ui-builder-core";

import type { LayoutRenderContext } from "../context.js";
import { wrapRowWithClickAction } from "./wrap-row-click-action.js";

describe("wrapRowWithClickAction", () => {
  const row: ComponentRowNode = {
    type: "component",
    id: "row-1",
    clickAction: { type: "entityRecord", target: "current" },
    component: {
      kind: "text",
      primary: { type: "static", value: "Open" },
    },
  };

  it("returns content unchanged when click action cannot resolve", () => {
    const content = createElement("span", null, "Plain");
    const context = {} as LayoutRenderContext;

    expect(wrapRowWithClickAction(row, content, context)).toBe(content);
  });

  it("wraps content with componentClickWrapper when target resolves", () => {
    const content = createElement("span", null, "Linked");
    const wrapper = vi.fn((_target, children) =>
      createElement("a", { href: "/app/order/order-1" }, children),
    );
    const context = {
      resolveComponentClickTarget: () => ({
        kind: "link",
        href: "/app/order/order-1",
        external: false,
      }),
      componentClickWrapper: wrapper,
    } as unknown as LayoutRenderContext;

    wrapRowWithClickAction(row, content, context);

    expect(wrapper).toHaveBeenCalledWith(
      { kind: "link", href: "/app/order/order-1", external: false },
      content,
    );
  });

  it("uses navigateComponentClick for form-field rows", () => {
    const formRow: ComponentRowNode = {
      ...row,
      component: {
        kind: "form-field",
        fieldPath: "name",
      },
    };
    const navigate = vi.fn();
    const content = createElement("input", { "aria-label": "name" });
    const context = {
      resolveComponentClickTarget: () => ({
        kind: "link",
        href: "/app/order/order-1",
        external: false,
      }),
      navigateComponentClick: navigate,
    } as unknown as LayoutRenderContext;

    const wrapped = wrapRowWithClickAction(formRow, content, context);
    expect(wrapped).not.toBe(content);
    expect(navigate).not.toHaveBeenCalled();
  });
});
