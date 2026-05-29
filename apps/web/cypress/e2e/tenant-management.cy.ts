describe("Tenant management routes", () => {
  it("redirects unauthenticated users from select-tenant to login", () => {
    cy.visit("/select-tenant");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
