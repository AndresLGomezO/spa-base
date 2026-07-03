Cypress.on("uncaught:exception", (err) => {
  if (err.message.includes("Minified React error #418")) {
    return false;
  }
});

// React Router builds index.html after vite-plugin-pwa generates the SW, so precache
// navigation can 404 deep links in Cypress. Use the preview server directly.
Cypress.on("window:before:load", (win) => {
  Object.defineProperty(win.navigator, "serviceWorker", {
    value: undefined,
    configurable: true,
  });
});
