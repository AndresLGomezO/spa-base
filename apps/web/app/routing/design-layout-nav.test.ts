import { describe, expect, it } from "vitest";

import { designLayoutEntityPath } from "./design-layout-nav.js";

describe("designLayoutEntityPath", () => {
  it("builds metrics layout path", () => {
    expect(designLayoutEntityPath("metrics", "account")).toBe(
      "/settings/design-layout/metrics/account",
    );
  });

  it("builds new forms layout path", () => {
    expect(designLayoutEntityPath("newForms", "account")).toBe(
      "/settings/design-layout/new-forms/account",
    );
  });
});
