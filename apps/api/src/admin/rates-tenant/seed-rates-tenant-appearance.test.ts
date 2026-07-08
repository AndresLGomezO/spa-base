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
  it("imports the sophisticated glass glow v2 theme with logo and palettes", () => {
    const appearance = parseRatesTenantAppearanceCatalog(
      readFileSync(catalogPath, "utf8"),
    );

    expect(appearance.preset).toBeUndefined();
    expect(appearance.logoUrl).toContain(
      "entitysystem-development.appspot.com",
    );
    expect(appearance.palettes?.primary?.anchorColor).toBe("#6B4EFF");
    expect(appearance.semanticsByScheme?.light?.["--color-card-border"]).toBe(
      "transparent",
    );
    expect(appearance.semanticsByScheme?.dark?.["--color-card-border"]).toBe(
      "#ffffff1a",
    );
    expect(appearance.semanticsByScheme?.dark?.["--color-card"]).toBe(
      "#15182299",
    );
    expect(appearance.colorsByScheme?.light?.["--color-sidebar"]).toBe(
      "#ffffff",
    );
    expect(appearance.effects?.backgroundApp?.dark).toContain("#1e1466");
    expect(appearance.effects?.gradientPrimary?.light).toBe(
      "linear-gradient(135deg, #9D7CFA 0%, #6644F8 100%)",
    );
    expect(appearance.effects?.shadowCard?.dark).toContain("inset");
    expect(appearance.effects?.cardGlow?.success).toContain("52, 211, 153");
    expect(appearance.effects?.cardGlow?.neutral).toContain("107, 78, 255");
    expect(appearance.effects?.backdropFilterCard?.dark).toBe(
      "blur(20px) saturate(180%)",
    );
    expect(appearance.fontFamily).toContain("Plus Jakarta Sans");
    expect(appearance.radius).toBe("1.5rem");
    expect(appearance.spacingScale?.base).toBe("1.5rem");
    expect(appearance.chartColors?.chart1).toBe("#a78bfa");
    expect(appearance.chartColors?.glow1).toBe("#c4b5fd");
  });
});
