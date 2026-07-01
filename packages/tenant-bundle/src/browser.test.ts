import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const browserSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "browser.ts"),
  "utf8",
);

describe("@repo/tenant-bundle/browser", () => {
  it("does not import Node-only modules", () => {
    expect(browserSource).not.toMatch(/from ["']node:crypto["']/);
    expect(browserSource).not.toMatch(/from "@repo\/metrics-engine"["']/);
  });
});
