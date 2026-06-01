import { describe, expect, it } from "vitest";

import {
  createEntityCategoryInputSchema,
  patchEntityCategoryInputSchema,
} from "./types.js";

describe("entity category schemas", () => {
  it("accepts valid create input", () => {
    expect(
      createEntityCategoryInputSchema.parse({
        name: "Operations",
        icon: "Folder",
        order: 0,
      }),
    ).toEqual({
      name: "Operations",
      icon: "Folder",
      order: 0,
    });
  });

  it("accepts partial patch input", () => {
    expect(patchEntityCategoryInputSchema.parse({ order: 5 })).toEqual({
      order: 5,
    });
  });
});
