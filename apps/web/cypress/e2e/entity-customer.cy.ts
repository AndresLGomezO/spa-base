describe("Entity routes", () => {
  it("redirects unauthenticated users to login from customer list", () => {
    cy.visit("/app/customer");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
    cy.contains("h1", "Welcome Back");
  });

  it("redirects unauthenticated users to login from customer create", () => {
    cy.visit("/app/customer/new");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
