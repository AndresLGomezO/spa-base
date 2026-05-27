describe("Home page", () => {
  it("displays the public home route", () => {
    cy.visit("/");
    cy.contains("h1", "Home", { timeout: 10000 });
    cy.contains("p", "Welcome.");
  });
});
