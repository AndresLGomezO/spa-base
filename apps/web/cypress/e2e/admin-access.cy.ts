describe("Admin access", () => {
  it("redirects unauthenticated users from admin settings to login", () => {
    cy.visit("/settings/admin");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
