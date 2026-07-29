import { describe, expect, it } from "vitest";

import { harvestTenantMessages } from "./harvest-live-catalog.js";

describe("harvestTenantMessages", () => {
  it("walks repository records into stable keys", async () => {
    const messages = await harvestTenantMessages(
      {
        entityDefinition: {
          list: async () => [
            {
              name: "loan",
              label: "Loans",
              fields: [
                {
                  name: "balance",
                  ui: { label: "Balance", placeholder: "0" },
                },
              ],
            },
          ],
        },
        entityCategory: { list: async () => [] },
        metricDefinition: {
          list: async () => [
            { name: "totalBalance", description: "Sum of balances" },
          ],
        },
        chartDefinition: { list: async () => [] },
        customView: {
          list: async () => [
            { viewId: "home", name: "Home", nav: { label: "Home link" } },
          ],
        },
        entityQueryDefinition: { list: async () => [] },
        entityUiOverride: { list: async () => [] },
        tenantSidebarLayout: {
          get: async () => ({
            description: "Sidebar",
            sidebarLayout: {
              id: "root",
              children: [{ id: "navHome", label: "Home" }],
            },
          }),
        },
        tenantDashboardLayout: { get: async () => null },
      },
      "tenant_a",
    );

    expect(messages["entity.loan.label"]).toBe("Loans");
    expect(messages["entity.loan.fields.balance.ui.label"]).toBe("Balance");
    expect(messages["metric.totalBalance.description"]).toBe("Sum of balances");
    expect(messages["customView.home.nav.label"]).toBe("Home link");
    expect(messages["sidebar.navHome.label"]).toBe("Home");
  });
});
