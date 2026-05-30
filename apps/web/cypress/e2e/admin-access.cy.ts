describe("Platform admin access", () => {
  it("redirects unauthenticated users from platform tenant settings to login", () => {
    cy.visit("/settings/tenant");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });

  it("redirects unauthenticated users from create tenant to login", () => {
    cy.visit("/platform/create-tenant");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
