Cypress.on("uncaught:exception", (err) => {
  if (err.message.includes("Minified React error #418")) {
    return false;
  }
});
