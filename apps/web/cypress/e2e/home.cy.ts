describe("Home page", () => {
  it("redirects unauthenticated users to login", () => {
    cy.visit("/");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
    cy.contains("h1", "Login");
    cy.contains("p", "Sign in with Firebase Auth (local emulator friendly).");
  });
});
