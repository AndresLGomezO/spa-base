import path from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { devDocumentCspPlugin } from "./vite-dev-document-csp-plugin";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    reactRouter(),
    ...(command === "serve" ? [devDocumentCspPlugin()] : []),
  ],
  ssr: {
    noExternal: [/^@repo\//, /^@app\//],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: [__dirname, path.resolve(__dirname, "../..")],
    },
  },
}));
