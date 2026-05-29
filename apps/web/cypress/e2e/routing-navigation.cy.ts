describe("Routing navigation", () => {
  it("redirects unauthenticated users from home to login", () => {
    cy.visit("/");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });

  it("redirects unauthenticated users from entity edit route to login", () => {
    cy.visit("/app/customer/record-1");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
