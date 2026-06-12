import type { Plugin } from "vite";

import { DEV_CONTENT_SECURITY_POLICY } from "./app/dev-content-security-policy";

/** Applies CSP to HTML document responses (Vite server.headers skips the shell document). */
export function devDocumentCspPlugin(): Plugin {
  return {
    name: "dev-document-csp",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === "GET" && req.headers.accept?.includes("text/html")) {
          res.setHeader("Content-Security-Policy", DEV_CONTENT_SECURITY_POLICY);
        }
        next();
      });
    },
  };
}
