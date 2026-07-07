import path from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import { devDocumentCspPlugin } from "./vite-dev-document-csp-plugin";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    reactRouter(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico"],
      manifest: {
        name: "Entity System - ESP",
        short_name: "ESP",
        description: "Entity System Platform",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#00a1e5",
        background_color: "#ffffff",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globDirectory: "build/client",
        globPatterns: ["**/*.{js,css,html,ico,svg,png,woff2,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
    ...(command === "serve" ? [devDocumentCspPlugin()] : []),
  ],
  appType: "spa",
  preview: {
    port: 4173,
    strictPort: true,
  },
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
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "app"),
    },
  },
}));
