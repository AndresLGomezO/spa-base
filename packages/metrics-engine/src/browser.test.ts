import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const BROWSER_ENTRY = fileURLToPath(new URL("./browser.ts", import.meta.url));

describe("@repo/metrics-engine/browser", () => {
  it("does not import node built-ins", () => {
    const source = readFileSync(BROWSER_ENTRY, "utf8");
    expect(source).not.toMatch(/from ["']node:crypto["']/);
    expect(source).not.toMatch(/from "\.\/metric-doc-id\.js"/);
  });
});

describe("date-granularity browser safety", () => {
  it("does not depend on metric-doc-id", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./date-granularity.ts", import.meta.url)),
      "utf8",
    );
    expect(source).not.toMatch(/metric-doc-id/);
    expect(source).toMatch(/metric-record-keys/);
  });
});
