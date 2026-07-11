import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseRatesTenantSidebarLayoutCatalog } from "./seed-rates-tenant-sidebar-layout.js";

const catalogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "catalogs",
  "rates-tenant-sidebar-layout.json",
);

describe("rates tenant sidebar layout catalog", () => {
  it("parses app shell catalog with default sidebar/header and floating footer", () => {
    const catalog = parseRatesTenantSidebarLayoutCatalog(
      readFileSync(catalogPath, "utf8"),
    );

    expect(catalog.settings.hamburgerBreakpoint).toBe("md");
    expect(catalog.settings.autoCollapseBreakpoint).toBeNull();

    const sidebarJson = JSON.stringify(catalog.sidebarLayout);
    expect(sidebarJson).toMatch(/"id":"sidebar-shell"/);
    expect(sidebarJson).toMatch(/"id":"sidebar-nav"/);
    expect(sidebarJson).toMatch(/"kind":"sidebar-nav"/);
    expect(sidebarJson).toMatch(/"kind":"notification-bell"/);
    expect(sidebarJson).toMatch(/"kind":"user"/);

    const headerJson = JSON.stringify(catalog.headerLayout);
    expect(headerJson).toMatch(/"id":"app-header-bar"/);
    expect(headerJson).toMatch(/"name":"Header"/);
    expect(headerJson).toMatch(/"kind":"container"/);
    expect(headerJson).not.toMatch(/"kind":"sidebar-trigger"/);

    const footerJson = JSON.stringify(catalog.footerLayout);
    expect(footerJson).toMatch(/"id":"app-footer-shell"/);
    expect(footerJson).toMatch(/"name":"Footer"/);
    expect(footerJson).toMatch(/"backgroundColor","value":"transparent"/);
    expect(footerJson).toContain("var(--color-background)");
    expect(footerJson).toContain("#6c5cff");
    expect(footerJson).toMatch(/"iconName":"Home"/);
    expect(footerJson).toMatch(/"iconName":"ArrowLeftRight"/);
    expect(footerJson).toMatch(/"iconName":"Wallet"/);
    expect(footerJson).toMatch(/"iconName":"Plus"/);
    expect(footerJson).toMatch(/"display":"photo"/);
    expect(footerJson).toMatch(/"displayFrom":"base"/);
    expect(footerJson).toMatch(/"displayTo":"base"/);
  });
});
