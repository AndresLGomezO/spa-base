describe("Routing tenant guard", () => {
  it("redirects unauthenticated users from home to login", () => {
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
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
