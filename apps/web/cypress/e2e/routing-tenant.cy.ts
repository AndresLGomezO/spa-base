describe("Routing tenant guard", () => {
  it("shows loading on home while tenant auto-bind is pending", () => {
    cy.intercept("GET", "**/auth/validate", {
      statusCode: 200,
      body: {
        ok: true,
        user: {
          uid: "user_123",
          email: "demo@example.com",
          permissions: [],
          isSuperAdmin: false,
          tenantId: null,
          availableTenants: ["tenant_a"],
          tenantOptions: [{ id: "tenant_a", name: "Tenant A" }],
          tenantRoleNames: [],
        },
        appCheck: { appId: "demo-app" },
      },
    }).as("validate");

    cy.visit("/");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/");
    cy.get('[role="status"]', { timeout: 10000 }).should("exist");
  });
});
