describe("Routing permissions", () => {
  it("redirects unauthenticated users from create route to login", () => {
    cy.visit("/app/customer/new");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
