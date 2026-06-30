import { describe, expect, it } from "vitest";

import { TENANT_BUNDLE_EXPORT_VERSION } from "@repo/tenant-bundle";

describe("exportTenantBundle shape", () => {
  it("uses the current bundle export version constant", () => {
    expect(TENANT_BUNDLE_EXPORT_VERSION).toBe(1);
  });
});
