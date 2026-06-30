import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema clickAction", () => {
  it("accepts entity record click action on current record", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      clickAction: {
        type: "entityRecord",
        target: "current",
      },
      component: {
        kind: "text",
        primary: { type: "field", path: "name" },
      },
    }) as ComponentRowNode;

    expect(parsed.clickAction).toEqual({
      type: "entityRecord",
      target: "current",
    });
  });

  it("accepts related entity and external URL click actions", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-2",
      clickAction: {
        type: "entityRecord",
        target: { relationFieldPath: "contactId" },
      },
      component: {
        kind: "image",
        primary: { type: "field", path: "photo" },
      },
    }) as ComponentRowNode;

    expect(parsed.clickAction).toEqual({
      type: "entityRecord",
      target: { relationFieldPath: "contactId" },
    });

    const external = componentRowSchema.parse({
      type: "component",
      id: "row-3",
      clickAction: {
        type: "externalUrl",
        url: { type: "static", value: "https://example.com" },
        openInNewTab: true,
      },
      component: {
        kind: "text",
        primary: { type: "static", value: "Visit" },
      },
    }) as ComponentRowNode;

    expect(external.clickAction).toEqual({
      type: "externalUrl",
      url: { type: "static", value: "https://example.com" },
      openInNewTab: true,
    });
  });
});
