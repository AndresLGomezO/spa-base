describe("Home page", () => {
  it("redirects unauthenticated users to login", () => {
    cy.visit("/");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
    cy.contains("h1", "Welcome Back");
    cy.contains("p", "Sign in to your account");
    cy.contains("button", "Sign in with Google");
  });
});
