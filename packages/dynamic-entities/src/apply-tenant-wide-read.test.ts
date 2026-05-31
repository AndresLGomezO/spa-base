import { describe, expect, it } from "vitest";

import { applyTenantWideRead } from "./apply-tenant-wide-read.js";

describe("applyTenantWideRead", () => {
  it("sets tenantWideRead when enabled", () => {
    const record = { label: "Loan" } as {
      label: string;
      tenantWideRead?: boolean;
    };
    expect(applyTenantWideRead(record, true)).toEqual({
      label: "Loan",
      tenantWideRead: true,
    });
  });

  it("removes tenantWideRead when disabled", () => {
    expect(
      applyTenantWideRead({ label: "Loan", tenantWideRead: true }, false),
    ).toEqual({
      label: "Loan",
    });
  });

  it("leaves the record unchanged when omitted", () => {
    expect(
      applyTenantWideRead({ label: "Loan", tenantWideRead: true }, undefined),
    ).toEqual({
      label: "Loan",
      tenantWideRead: true,
    });
  });
});
