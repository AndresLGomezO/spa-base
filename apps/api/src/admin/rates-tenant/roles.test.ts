import { describe, expect, it } from "vitest";

import { buildRatesCustomRoles } from "./roles.js";

describe("buildRatesCustomRoles", () => {
  it("grants hook-backed loan child entities to normalRatesUser", () => {
    const [normalRatesUser] = buildRatesCustomRoles();
    const grants = normalRatesUser?.grants ?? [];

    expect(grants).toContain("loanMonthlyCost.read");
    expect(grants).toContain("loanMonthlyCost.create");
    expect(grants).toContain("loanUtilization.read");
    expect(grants).toContain("loanUtilization.create");
  });
});
