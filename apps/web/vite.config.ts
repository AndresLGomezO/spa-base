import path from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: [__dirname, path.resolve(__dirname, "../..")],
    },
  },
});
