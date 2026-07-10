import { describe, expect, it } from "vitest";

import { componentRowSchema } from "./ui-layout-schema.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("componentRowSchema user", () => {
  it("parses user component rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-1",
      component: {
        kind: "user",
        display: "photo-and-name",
        nameFormat: "first",
        imageSize: 48,
      },
    }) as ComponentRowNode;

    expect(parsed.component).toMatchObject({
      kind: "user",
      display: "photo-and-name",
      nameFormat: "first",
      imageSize: 48,
    });
  });

  it("parses profile-button display with avatarShape", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-2",
      component: {
        kind: "user",
        display: "profile-button",
        profileButtonContent: "photo",
        imageSize: 48,
        avatarShape: "circle",
      },
    }) as ComponentRowNode;

    expect(parsed.component).toMatchObject({
      kind: "user",
      display: "profile-button",
      profileButtonContent: "photo",
      imageSize: 48,
      avatarShape: "circle",
    });
  });
});
