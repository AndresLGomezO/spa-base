describe("Tenant management routes", () => {
  it("redirects legacy select-tenant URL to home when unauthenticated", () => {
    cy.visit("/select-tenant");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
