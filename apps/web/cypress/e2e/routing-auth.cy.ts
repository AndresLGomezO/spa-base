describe("Routing auth guard", () => {
  it("redirects unauthenticated users from entity routes to login", () => {
    cy.visit("/app/customer");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
    cy.contains("h1", "Welcome Back");
  });
});
