import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseRatesTenantAppearanceCatalog } from "./seed-rates-tenant-appearance.js";

const catalogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "catalogs",
  "rates-tenant-appearance.json",
);

describe("rates tenant appearance catalog", () => {
  it("imports the sophisticated violet theme with logo and palettes", () => {
    const appearance = parseRatesTenantAppearanceCatalog(
      readFileSync(catalogPath, "utf8"),
    );

    expect(appearance.preset).toBe("sophisticated");
    expect(appearance.logoUrl).toContain(
      "entitysystem-development.appspot.com",
    );
    expect(appearance.palettes?.primary?.anchorColor).toBe("#6B4EFF");
    expect(appearance.semanticsByScheme?.light?.["--color-primary"]).toBe(
      "#6B4EFF",
    );
    expect(appearance.colorsByScheme?.light?.["--color-sidebar"]).toBe(
      "#ffffff",
    );
    expect(appearance.effects?.gradientPrimary?.light).toBe(
      "linear-gradient(135deg, #9D7CFA 0%, #6644F8 100%)",
    );
    expect(appearance.fontFamily).toContain("Plus Jakarta Sans");
    expect(appearance.radius).toBe("1rem");
    expect(appearance.spacingScale?.base).toBe("1.5rem");
    expect(appearance.chartColors?.chart1).toBe("#6B4EFF");
  });
});
