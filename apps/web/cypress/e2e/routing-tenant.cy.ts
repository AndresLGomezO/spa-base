describe("Routing tenant guard", () => {
  it("redirects authenticated users without tenant to select-tenant", () => {
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
        },
        appCheck: { appId: "demo-app" },
      },
    }).as("validate");

    cy.visit("/app/customer");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
