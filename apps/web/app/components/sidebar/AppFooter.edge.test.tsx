import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  FOOTER_HOST_DEFAULT_CHROME_CLASS_NAME,
  FOOTER_HOST_STRUCTURAL_CLASS_NAME,
} from "./AppFooter";

describe("AppFooter edge-to-edge host classes", () => {
  it("uses the Chrome safe-area-max-inset bleed class on both hosts", () => {
    expect(FOOTER_HOST_STRUCTURAL_CLASS_NAME).toContain(
      "app-shell-footer-edge",
    );
    expect(FOOTER_HOST_DEFAULT_CHROME_CLASS_NAME).toContain(
      "app-shell-footer-edge",
    );
  });

  it("does not lift the host with safe-area-inset-bottom alone", () => {
    expect(FOOTER_HOST_STRUCTURAL_CLASS_NAME).not.toMatch(
      /bottom-\[env\(safe-area-inset-bottom/,
    );
    expect(FOOTER_HOST_DEFAULT_CHROME_CLASS_NAME).not.toMatch(
      /bottom-\[env\(safe-area-inset-bottom/,
    );
  });

  it("defines the Chrome calc fast-path in app.css", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../app.css"),
      "utf8",
    );
    expect(css).toContain(".app-shell-footer-edge");
    expect(css).toContain("safe-area-max-inset-bottom");
    expect(css).toMatch(/calc\(\s*env\(safe-area-inset-bottom/);
  });
});
