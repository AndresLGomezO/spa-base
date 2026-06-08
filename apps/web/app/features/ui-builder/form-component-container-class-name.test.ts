import { describe, expect, it } from "vitest";

import { formComponentContainerClassName } from "./form-component-container-class-name";

describe("formComponentContainerClassName", () => {
  it("always includes full width", () => {
    expect(formComponentContainerClassName()).toBe("w-full");
  });

  it("removes flex-grow utilities from builder styles", () => {
    expect(
      formComponentContainerClassName("flex-[1_1_0%] text-left flex-1"),
    ).toBe("w-full text-left");
  });
});
