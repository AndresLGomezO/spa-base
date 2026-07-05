import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["../../.local/tenant-import/**/*.test.ts"],
  },
});
