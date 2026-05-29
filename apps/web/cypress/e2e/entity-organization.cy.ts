describe("Entity routes", () => {
  it("redirects unauthenticated users to login from organization list", () => {
    cy.visit("/app/organization");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
    cy.contains("h1", "Welcome Back");
  });

  it("redirects unauthenticated users to login from organization create", () => {
    cy.visit("/app/organization/new");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
